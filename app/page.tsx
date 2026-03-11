"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Users, 
  Calendar, 
  User, 
  CalendarCheck, 
  Link2, 
  LogOut, 
  Eye,
  Clock,
  MapPin,
  Video,
  ExternalLink,
  Sparkles,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Globe,
  ChevronDown
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeSlot = string; // "day-hour", e.g. "0-9" = Monday 9am

type Timezone = {
  id: string;
  label: string;
  offset: number; // UTC offset in hours
  city: string;
  flag: string;
};

type Member = {
  id: string;
  name: string;
  color: string;
  availability: TimeSlot[]; // stored in their local time
  timezone: string; // timezone id
};

type Meeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  platform: string;
  link: string;
  host: string;
  participants: string[];
  description?: string;
};

type UserData = {
  id: string;
  name: string;
  email: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["週一", "週二", "週三", "週四", "週五"];
const HOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const DISPLAY_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // 用於顯示的小時範圍
const COLORS = [
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-cyan-500",
];

const TIMEZONES: Timezone[] = [
  { id: "Asia/Taipei", label: "GMT+8", offset: 8, city: "台北", flag: "🇹🇼" },
  { id: "America/Los_Angeles", label: "GMT-7", offset: -7, city: "洛杉磯", flag: "🇺🇸" },
  { id: "Europe/London", label: "GMT+0", offset: 0, city: "倫敦", flag: "🇬🇧" },
  { id: "Asia/Tokyo", label: "GMT+9", offset: 9, city: "東京", flag: "🇯🇵" },
  { id: "Europe/Paris", label: "GMT+1", offset: 1, city: "巴黎", flag: "🇫🇷" },
  { id: "Asia/Singapore", label: "GMT+8", offset: 8, city: "新加坡", flag: "🇸🇬" },
];

const slot = (day: number, hour: number): TimeSlot => `${day}-${hour}`;

// 將本地時間轉換為 UTC 時間槽
function localSlotToUtc(day: number, hour: number, timezone: Timezone): TimeSlot {
  let utcHour = hour - timezone.offset;
  let utcDay = day;
  
  if (utcHour >= 24) {
    utcHour -= 24;
    utcDay += 1;
  } else if (utcHour < 0) {
    utcHour += 24;
    utcDay -= 1;
  }
  
  // 處理週末跨越
  if (utcDay > 4) utcDay = 0;
  if (utcDay < 0) utcDay = 4;
  
  return slot(utcDay, utcHour);
}

// 將 UTC 時間槽轉換為本地時間
function utcSlotToLocal(utcSlot: TimeSlot, timezone: Timezone): { day: number; hour: number } | null {
  const [utcDay, utcHour] = utcSlot.split("-").map(Number);
  
  let localHour = utcHour + timezone.offset;
  let localDay = utcDay;
  
  if (localHour >= 24) {
    localHour -= 24;
    localDay += 1;
  } else if (localHour < 0) {
    localHour += 24;
    localDay -= 1;
  }
  
  // 超出週一到週五範圍
  if (localDay < 0 || localDay > 4) return null;
  
  return { day: localDay, hour: localHour };
}

// 將成員的本地可用時間轉換為 UTC 時間槽集合
function getUtcAvailability(member: Member): Set<TimeSlot> {
  const tz = TIMEZONES.find(t => t.id === member.timezone)!;
  const utcSlots = new Set<TimeSlot>();
  
  for (const localSlot of member.availability) {
    const [day, hour] = localSlot.split("-").map(Number);
    const utcSlot = localSlotToUtc(day, hour, tz);
    utcSlots.add(utcSlot);
  }
  
  return utcSlots;
}

// 找出所有成員的共同 UTC 時間槽
function findCommonUtcSlots(members: Member[]): TimeSlot[] {
  if (members.length === 0) return [];
  
  const allUtcAvailabilities = members.map(m => getUtcAvailability(m));
  const firstSet = allUtcAvailabilities[0];
  
  const commonUtcSlots: TimeSlot[] = [];
  firstSet.forEach(utcSlot => {
    if (allUtcAvailabilities.every(set => set.has(utcSlot))) {
      commonUtcSlots.push(utcSlot);
    }
  });
  
  return commonUtcSlots;
}

// 將 UTC 共同時段轉換為指定時區的本地時間
function convertCommonSlotsToTimezone(commonUtcSlots: TimeSlot[], timezone: Timezone): TimeSlot[] {
  const localSlots: TimeSlot[] = [];
  
  for (const utcSlot of commonUtcSlots) {
    const local = utcSlotToLocal(utcSlot, timezone);
    if (local && local.hour >= 0 && local.hour <= 23) {
      localSlots.push(slot(local.day, local.hour));
    }
  }
  
  return localSlots;
}

// ─── Fake initial data ────────────────────────────────────────────────────────

// 設計共同時間為 UTC 週三 00:00-02:00
// - 台北 (GMT+8)：週三 08:00-10:00
// - 洛杉磯 (GMT-7)：週二 17:00-19:00  
// - 倫敦 (GMT+0)：週三 00:00-02:00（顯示為凌晨）

const INITIAL_MEMBERS: Member[] = [
  {
    id: "me",
    name: "我",
    color: "bg-blue-500",
    timezone: "Asia/Taipei",
    availability: [
      // 台北時間 - 週三 08:00-10:00 對應 UTC 00:00-02:00
      slot(0, 9), slot(0, 10), slot(0, 11),
      slot(0, 14), slot(0, 15), slot(0, 16),
      slot(2, 8),  slot(2, 9), slot(2, 10),  // 共同時段
      slot(3, 14), slot(3, 15), slot(3, 16),
      slot(4, 9),  slot(4, 10),
    ],
  },
  {
    id: "xiao-liang",
    name: "小梁",
    color: "bg-green-500",
    timezone: "America/Los_Angeles",
    availability: [
      // 洛杉磯時間 - 週二 17:00-19:00 對應 UTC 週三 00:00-02:00
      slot(0, 9),  slot(0, 10), slot(0, 11),
      slot(1, 17), slot(1, 18), slot(1, 19), // 共同時段（週二下午）
      slot(2, 14), slot(2, 15), slot(2, 16),
      slot(4, 9),  slot(4, 10),
    ],
  },
  {
    id: "lu-lu",
    name: "盧盧",
    color: "bg-purple-500",
    timezone: "Europe/London",
    availability: [
      // 倫敦時間 - 週三 00:00-02:00 對應 UTC 00:00-02:00
      slot(1, 10), slot(1, 11), slot(1, 12),
      slot(2, 0),  slot(2, 1), slot(2, 2),   // 共同時段（週三凌晨）
      slot(3, 14), slot(3, 15),
    ],
  },
];

// 模擬會議資料
const MOCK_MEETINGS: Record<string, Meeting> = {
  "meet.google.com/abc-defg-hij": {
    id: "1",
    title: "Q1 產品規劃會議",
    date: "2025-03-15",
    time: "14:00",
    duration: "1 小時",
    platform: "Google Meet",
    link: "https://meet.google.com/abc-defg-hij",
    host: "小梁",
    participants: ["小梁", "盧盧", "小明", "小華"],
    description: "討論 Q1 的產品路線圖和優先順序",
  },
  "zoom.us/j/123456789": {
    id: "2",
    title: "設計評審會議",
    date: "2025-03-18",
    time: "10:00",
    duration: "45 分鐘",
    platform: "Zoom",
    link: "https://zoom.us/j/123456789",
    host: "盧盧",
    participants: ["盧盧", "設計師小王", "PM 小李"],
    description: "審核新版首頁設計稿",
  },
  "teams.microsoft.com/l/meetup-join/abc123": {
    id: "3",
    title: "週例會",
    date: "2025-03-12",
    time: "09:30",
    duration: "30 分鐘",
    platform: "Microsoft Teams",
    link: "https://teams.microsoft.com/l/meetup-join/abc123",
    host: "經理",
    participants: ["全體成員"],
    description: "每週進度同步與問題討論",
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function extractMeetingKey(url: string): string | null {
  try {
    // 嘗試解析 URL
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = "https://" + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    
    // Google Meet
    if (parsed.hostname.includes("meet.google.com")) {
      return "meet.google.com" + parsed.pathname;
    }
    // Zoom
    if (parsed.hostname.includes("zoom.us")) {
      return "zoom.us" + parsed.pathname;
    }
    // Microsoft Teams
    if (parsed.hostname.includes("teams.microsoft.com")) {
      return "teams.microsoft.com" + parsed.pathname;
    }
    
    return parsed.hostname + parsed.pathname;
  } catch {
    return null;
  }
}

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "Google Meet":
      return <Video className="w-4 h-4 text-green-600" />;
    case "Zoom":
      return <Video className="w-4 h-4 text-blue-500" />;
    case "Microsoft Teams":
      return <Video className="w-4 h-4 text-purple-600" />;
    default:
      return <Video className="w-4 h-4" />;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  };
  return date.toLocaleDateString('zh-TW', options);
}

// ─── Schedule Grid Component ──────────────────────────────────────────────────

function formatHour(hour: number): string {
  if (hour < 0) return `${hour + 24}:00`;
  if (hour >= 24) return `${hour - 24}:00`;
  return `${hour}:00`;
}

function ScheduleGrid({
  availability,
  onToggle,
  emerald = false,
  hours = DISPLAY_HOURS,
}: {
  availability: TimeSlot[];
  onToggle?: (day: number, hour: number) => void;
  emerald?: boolean;
  hours?: number[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="w-14" />
            {DAYS.map((d) => (
              <th key={d} className="p-2 text-center font-medium text-sm">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h}>
              <td className="text-right pr-3 text-muted-foreground text-xs py-0.5 whitespace-nowrap">
                {formatHour(h)}
              </td>
              {DAYS.map((_, d) => {
                const s = slot(d, h);
                const active = availability.includes(s);
                const cellClass = active
                  ? emerald
                    ? "bg-emerald-400 border-emerald-400"
                    : "bg-primary border-primary"
                  : "bg-muted border-border hover:bg-muted/60";
                return (
                  <td key={d} className="p-0.5">
                    <div
                      className={`h-8 rounded border transition-colors ${cellClass} ${onToggle ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => onToggle?.(d, h)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex gap-4 mb-5 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ─── Login Page Component ─────────────────────────────────────────────────────

function LoginPage({ onLogin }: { onLogin: (user: UserData) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 模擬登入延遲
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 模擬登入成功
    onLogin({
      id: "user-1",
      name: email.split("@")[0] || "使用者",
      email: email,
    });
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 mb-4">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            MeetFlow
          </h1>
          <p className="text-muted-foreground mt-2">簡單的會議排程工具</p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none dark:border dark:border-slate-800">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">登入帳號</CardTitle>
            <CardDescription>
              輸入您的電子郵件和密碼以繼續
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">電子郵件</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">密碼</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    登入中...
                  </span>
                ) : (
                  "登入"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              還沒有帳號？{" "}
              <button className="text-blue-600 hover:underline font-medium">
                立即註冊
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Demo hint */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          💡 提示：輸入任意電子郵件和密碼即可體驗
        </p>
      </div>
    </div>
  );
}

// ─── Meeting Link Input Component ─────────────────────────────────────────────

function MeetingLinkInput({ onMeetingFound }: { onMeetingFound: (meeting: Meeting) => void }) {
  const [link, setLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 600));

    const key = extractMeetingKey(link);
    if (key && MOCK_MEETINGS[key]) {
      onMeetingFound(MOCK_MEETINGS[key]);
      setLink("");
    } else {
      setError("找不到此會議連結的資訊，請確認連結是否正確");
    }

    setIsLoading(false);
  };

  return (
    <Card className="border-dashed border-2 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">貼上會議連結</h3>
            <p className="text-sm text-muted-foreground">支援 Google Meet、Zoom、Microsoft Teams</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setError("");
            }}
            className="h-11"
          />
          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {error}
            </p>
          )}
          <Button 
            type="submit" 
            className="w-full"
            disabled={!link.trim() || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                查詢中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                查看會議資訊
              </span>
            )}
          </Button>
        </form>

        {/* 範例連結提示 */}
        <div className="mt-4 pt-4 border-t border-dashed">
          <p className="text-xs text-muted-foreground mb-2">試試這些範例連結：</p>
          <div className="flex flex-wrap gap-2">
            {Object.values(MOCK_MEETINGS).slice(0, 2).map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => setLink(meeting.link)}
                className="text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors truncate max-w-[200px]"
              >
                {meeting.link.replace("https://", "")}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create Share Link Component ──────────────────────────────────────────────

function CreateShareLink() {
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsCreating(true);

    // 模擬產生連結
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const randomId = Math.random().toString(36).substring(2, 8);
    setGeneratedLink(`https://meetflow.app/s/${randomId}`);
    setIsCreating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setTitle("");
    setGeneratedLink("");
    setCopied(false);
  };

  return (
    <Card className="border-dashed border-2 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">建立分享連結</h3>
            <p className="text-sm text-muted-foreground">建立排程頁面並分享給參與者</p>
          </div>
        </div>

        {!generatedLink ? (
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="輸入會議名稱，例如：Q1 團隊會議"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="h-11"
            />
            <Button 
              onClick={handleCreate}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  建立中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  建立分享連結
                </span>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Success state */}
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">連結已建立！</span>
            </div>
            
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border">
              <p className="text-xs text-muted-foreground mb-1">會議名稱</p>
              <p className="font-medium text-sm">{title}</p>
            </div>

            <div className="flex gap-2">
              <Input
                readOnly
                value={generatedLink}
                className="h-10 bg-white dark:bg-slate-900 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-3 shrink-0"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleReset}
              >
                建立新連結
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                onClick={handleCopy}
              >
                {copied ? "已複製！" : "複製連結"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Meeting Detail Card Component ────────────────────────────────────────────

function MeetingDetailCard({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  return (
    <Card className="overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              {getPlatformIcon(meeting.platform)}
            </div>
            <div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 mb-1">
                {meeting.platform}
              </Badge>
              <h3 className="text-lg font-semibold text-white">{meeting.title}</h3>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20"
          >
            關閉
          </Button>
        </div>
      </div>

      <CardContent className="pt-6 space-y-5">
        {/* Date & Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{formatDate(meeting.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{meeting.time}</span>
            <Badge variant="outline" className="text-xs">{meeting.duration}</Badge>
          </div>
        </div>

        {/* Description */}
        {meeting.description && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
            <p className="text-sm text-muted-foreground">{meeting.description}</p>
          </div>
        )}

        {/* Host & Participants */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">主持人：</span>
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-blue-500 text-white text-xs">
                  {meeting.host[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{meeting.host}</span>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium">參與者：</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {meeting.participants.map((p, i) => (
                <Badge key={i} variant="secondary" className="font-normal">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Meeting Link */}
        <div className="pt-4 border-t">
          <a
            href={meeting.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-950 dark:hover:to-indigo-950 transition-colors group"
          >
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600 font-medium">加入會議</span>
            </div>
            <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function MeetFlow() {
  const [user, setUser] = useState<UserData | null>(null);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState("xiao-liang");
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [displayTimezone, setDisplayTimezone] = useState<string>("Asia/Taipei");
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false);

  // 未登入時顯示登入頁面
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const me = members.find((m) => m.id === "me")!;
  const others = members.filter((m) => m.id !== "me");
  const viewing = members.find((m) => m.id === viewId) ?? others[0];
  const currentTz = TIMEZONES.find(t => t.id === displayTimezone)!;

  // 計算共同空閒時段（先找 UTC 共同時段，再轉換到顯示時區）
  const commonUtcSlots = findCommonUtcSlots(members);
  const commonSlots = convertCommonSlotsToTimezone(commonUtcSlots, currentTz);

  // 取得成員在顯示時區的可用時間
  function getMemberAvailabilityInDisplayTz(member: Member): TimeSlot[] {
    const memberTz = TIMEZONES.find(t => t.id === member.timezone)!;
    const localSlots: TimeSlot[] = [];
    
    for (const localSlot of member.availability) {
      const [day, hour] = localSlot.split("-").map(Number);
      // 先轉 UTC，再轉到目標時區
      const utcSlot = localSlotToUtc(day, hour, memberTz);
      const targetLocal = utcSlotToLocal(utcSlot, currentTz);
      if (targetLocal) {
        localSlots.push(slot(targetLocal.day, targetLocal.hour));
      }
    }
    
    return localSlots;
  }

  function toggleMySlot(day: number, hour: number) {
    const s = slot(day, hour);
    setMembers((prev) =>
      prev.map((m) =>
        m.id !== "me"
          ? m
          : {
              ...m,
              availability: m.availability.includes(s)
                ? m.availability.filter((x) => x !== s)
                : [...m.availability, s],
            }
      )
    );
  }

  function addMember() {
    const name = newName.trim();
    if (!name) return;
    const color = COLORS[members.length % COLORS.length];
    const newMember: Member = {
      id: `member-${Date.now()}`,
      name,
      color,
      availability: [],
      timezone: "Asia/Taipei", // 預設時區
    };
    setMembers((prev) => [...prev, newMember]);
    setNewName("");
    setOpen(false);
  }

  function handleLogout() {
    setUser(null);
    setCurrentMeeting(null);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">MeetFlow</h1>
            <Badge variant="secondary" className="text-xs font-normal">
              Beta
            </Badge>
          </div>
          
          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                  {user.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Meeting Link Input Section */}
        <div className="mb-8">
          {currentMeeting ? (
            <MeetingDetailCard 
              meeting={currentMeeting} 
              onClose={() => setCurrentMeeting(null)} 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MeetingLinkInput onMeetingFound={setCurrentMeeting} />
              <CreateShareLink />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            排程工具
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Tabs defaultValue="members">
          <TabsList className="mb-8 h-10">
            <TabsTrigger value="members" className="gap-1.5 text-sm">
              <Users className="w-3.5 h-3.5" />
              成員
            </TabsTrigger>
            <TabsTrigger value="my-schedule" className="gap-1.5 text-sm">
              <User className="w-3.5 h-3.5" />
              我的時間表
            </TabsTrigger>
            <TabsTrigger value="view-member" className="gap-1.5 text-sm">
              <Calendar className="w-3.5 h-3.5" />
              查看成員
            </TabsTrigger>
            <TabsTrigger value="common" className="gap-1.5 text-sm">
              <CalendarCheck className="w-3.5 h-3.5" />
              共同空閒
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Members ── */}
          <TabsContent value="members">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold">成員列表</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  共 {members.length} 位成員，分布於 {new Set(members.map(m => m.timezone)).size} 個時區
                </p>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    加入成員
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xs">
                  <DialogHeader>
                    <DialogTitle>加入新成員</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 mt-2">
                    <Input
                      placeholder="輸入成員名稱"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addMember()}
                      autoFocus
                    />
                    <Button onClick={addMember} disabled={!newName.trim()}>
                      確認加入
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((m) => {
                const tz = TIMEZONES.find(t => t.id === m.timezone);
                return (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarFallback
                            className={`${m.color} text-white text-sm font-semibold`}
                          >
                            {m.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{m.name}</p>
                            {m.id === "me" && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                你
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {m.availability.length} 個空閒時段
                          </p>
                        </div>
                      </div>
                      {tz && (
                        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{tz.flag}</span>
                          <span>{tz.city}</span>
                          <Badge variant="secondary" className="text-xs font-normal ml-auto">
                            {tz.label}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Tab 2: My Schedule ── */}
          <TabsContent value="my-schedule">
            <div className="mb-5">
              <h2 className="text-base font-semibold">我的時間表</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                點擊格子來切換你的空閒時段
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Legend
                  items={[
                    { color: "bg-primary", label: "空閒" },
                    { color: "bg-muted border border-border", label: "忙碌" },
                  ]}
                />
                <ScheduleGrid
                  availability={me.availability}
                  onToggle={toggleMySlot}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: View Member ── */}
          <TabsContent value="view-member">
            <div className="mb-5">
              <h2 className="text-base font-semibold">查看成員時間表</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                選擇成員來查看他們的空閒時段（以你的時區顯示）
              </p>
            </div>

            {others.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">
                尚無其他成員，請先在「成員」頁加入
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {others.map((m) => {
                    const tz = TIMEZONES.find(t => t.id === m.timezone);
                    return (
                      <Button
                        key={m.id}
                        variant={viewing?.id === m.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewId(m.id)}
                        className="gap-1.5"
                      >
                        <span>{tz?.flag}</span>
                        {m.name}
                      </Button>
                    );
                  })}
                </div>

                {viewing && (() => {
                  const viewingTz = TIMEZONES.find(t => t.id === viewing.timezone);
                  const myTz = TIMEZONES.find(t => t.id === me.timezone)!;
                  const convertedAvailability = getMemberAvailabilityInDisplayTz(viewing);
                  
                  return (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback
                                className={`${viewing.color} text-white text-xs font-semibold`}
                              >
                                {viewing.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            {viewing.name} 的時間表
                          </CardTitle>
                          {viewingTz && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Globe className="w-4 h-4" />
                              <span>{viewingTz.flag} {viewingTz.city}</span>
                              <Badge variant="secondary" className="text-xs">
                                {viewingTz.label}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <Legend
                            items={[
                              { color: "bg-primary", label: "空閒" },
                              { color: "bg-muted border border-border", label: "忙碌" },
                            ]}
                          />
                          <Badge variant="outline" className="text-xs">
                            以 {myTz.city} 時間顯示
                          </Badge>
                        </div>
                        <ScheduleGrid availability={convertedAvailability} />
                        
                        {viewingTz && viewingTz.id !== myTz.id && (
                          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>
                                {viewing.name} 在 {viewingTz.city}（{viewingTz.label}），
                                與你相差 {Math.abs(viewingTz.offset - myTz.offset)} 小時
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            )}
          </TabsContent>

          {/* ── Tab 4: Common Availability ── */}
          <TabsContent value="common">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-base font-semibold">共同空閒時間</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  所有 {members.length} 位成員都空閒的時段
                </p>
              </div>
              
              {/* 時區選擇器 */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 min-w-[180px] justify-between"
                  onClick={() => setTzDropdownOpen(!tzDropdownOpen)}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span>{currentTz.flag} {currentTz.city}</span>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {currentTz.label}
                    </Badge>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${tzDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
                
                {tzDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-background border rounded-lg shadow-lg z-20 py-1">
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                      選擇顯示時區
                    </div>
                    {TIMEZONES.map((tz) => (
                      <button
                        key={tz.id}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
                          displayTimezone === tz.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => {
                          setDisplayTimezone(tz.id);
                          setTzDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span>{tz.flag}</span>
                          <span>{tz.city}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {tz.label}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 成員時區概覽 */}
            <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border">
              <div className="flex items-center gap-2 text-sm font-medium mb-3">
                <Globe className="w-4 h-4" />
                成員時區分布
              </div>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const tz = TIMEZONES.find(t => t.id === m.timezone);
                  return (
                    <div 
                      key={m.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-700 border text-sm"
                    >
                      <div className={`w-2 h-2 rounded-full ${m.color}`} />
                      <span>{m.name}</span>
                      <span className="text-muted-foreground">{tz?.flag} {tz?.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <Legend
                    items={[
                      { color: "bg-emerald-400", label: "共同空閒" },
                      { color: "bg-muted border border-border", label: "非共同" },
                    ]}
                  />
                  <Badge variant="outline" className="text-xs">
                    以 {currentTz.city} 時間顯示
                  </Badge>
                </div>
                {commonSlots.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">
                    目前沒有共同空閒時段
                  </p>
                ) : (
                  (() => {
                    // 計算需要顯示的小時範圍
                    const hoursInSlots = commonSlots.map(s => parseInt(s.split("-")[1]));
                    const minHour = Math.max(0, Math.min(...hoursInSlots) - 1);
                    const maxHour = Math.min(23, Math.max(...hoursInSlots) + 1);
                    const displayRange = Array.from(
                      { length: maxHour - minHour + 1 }, 
                      (_, i) => minHour + i
                    );
                    return <ScheduleGrid availability={commonSlots} emerald hours={displayRange} />;
                  })()
                )}
              </CardContent>
            </Card>

            {commonSlots.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  共 {commonSlots.length} 個共同空閒時段（{currentTz.city}時間）：
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {commonSlots.map((s) => {
                    const [d, h] = s.split("-").map(Number);
                    return (
                      <div
                        key={s}
                        className="text-sm px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
                      >
                        {DAYS[d]} {formatHour(h)}–{formatHour(h + 1)}
                      </div>
                    );
                  })}
                </div>
                
                {/* 顯示各成員的當地時間 */}
                <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    📍 各成員的當地時間：
                  </p>
                  <div className="space-y-1.5">
                    {members.map((m) => {
                      const memberTz = TIMEZONES.find(t => t.id === m.timezone)!;
                      // 將共同時段轉換到該成員的時區
                      const memberLocalSlots = commonUtcSlots.map(utcSlot => {
                        const local = utcSlotToLocal(utcSlot, memberTz);
                        if (!local) return null;
                        return `${DAYS[local.day]} ${formatHour(local.hour)}`;
                      }).filter(Boolean);
                      
                      return (
                        <div key={m.id} className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <div className={`w-2 h-2 rounded-full ${m.color}`} />
                          <span className="font-medium">{m.name}</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            {memberTz.flag} {memberTz.city}：
                          </span>
                          <span>{memberLocalSlots.join(", ")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
