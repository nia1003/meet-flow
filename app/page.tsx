"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Plus, Users, Calendar, User, CalendarCheck, Link2, Copy, CheckCircle, LogOut, LogIn, Settings } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeSlot = string; // "day-hour", e.g. "0-9" = Monday 9am

type AuthUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
};

type Member = {
  id: string;
  name: string;
  color: string;
  availability: TimeSlot[];
};

type Meeting = {
  id: string;
  title: string;
  createdAt: string;
  members: Member[];
  commonSlots: TimeSlot[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["週一", "週二", "週三", "週四", "週五"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const COLORS = [
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-cyan-500",
];

const slot = (day: number, hour: number): TimeSlot => `${day}-${hour}`;

// ─── Authentication Data ──────────────────────────────────────────────────────

/**
 * 假帳號系統（演示用）
 * 實際應用應該用後端數據庫 + 密碼加密
 */
const DEMO_ACCOUNTS = [
  {
    username: "user1",
    password: "abc123",
    name: "小A",
    email: "xiaoming@example.com",
  },
  {
    username: "user2",
    password: "abc123",
    name: "小B",
    email: "xiaoliang@example.com",
  },
  {
    username: "user3",
    password: "abc123",
    name: "小C",
    email: "xiaofang@example.com",
  },
];

/**
 * 驗證帳號密碼
 */
function validateAccount(username: string, password: string) {
  const account = DEMO_ACCOUNTS.find(
    (acc) => acc.username === username && acc.password === password
  );
  return account ? { success: true, user: account } : { success: false, user: null };
}

// ─── Fake initial data ────────────────────────────────────────────────────────

// 假資料：三人皆有「週三 9–11」共同空閒，方便展示
const INITIAL_MEMBERS: Member[] = [
  {
    id: "me",
    name: "我",
    color: "bg-blue-500",
    availability: [
      slot(0, 9), slot(0, 10), slot(0, 11),          // Mon 9–12
      slot(0, 14), slot(0, 15), slot(0, 16),         // Mon 14–17
      slot(2, 9),  slot(2, 10), slot(2, 11),         // Wed 9–12（共同）
      slot(3, 14), slot(3, 15), slot(3, 16),         // Thu 14–17
      slot(4, 9),  slot(4, 10),                      // Fri 9–11
    ],
  },
  {
    id: "xiao-liang",
    name: "小梁",
    color: "bg-green-500",
    availability: [
      slot(0, 9),  slot(0, 10), slot(0, 11),         // Mon 9–12
      slot(2, 9),  slot(2, 10), slot(2, 11),         // Wed 9–12（共同）
      slot(2, 14), slot(2, 15), slot(2, 16),         // Wed 14–17
      slot(4, 9),  slot(4, 10),                      // Fri 9–11
    ],
  },
  {
    id: "lu-lu",
    name: "盧盧",
    color: "bg-purple-500",
    availability: [
      slot(1, 10), slot(1, 11), slot(1, 12),         // Tue 10–13
      slot(2, 9),  slot(2, 10), slot(2, 11),         // Wed 9–12（共同）
      slot(3, 14), slot(3, 15),                      // Thu 14–16
    ],
  },
];

// ─── LocalStorage Utils ────────────────────────────────────────────────────────

const STORAGE_KEY = "meetflow_user";

function saveUser(user: AuthUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
}

function loadUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : null;
}

function removeUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ─── Schedule Grid Component ──────────────────────────────────────────────────

function ScheduleGrid({
  availability,
  onToggle,
  emerald = false,
}: {
  availability: TimeSlot[];
  onToggle?: (day: number, hour: number) => void;
  emerald?: boolean;
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
          {HOURS.map((h) => (
            <tr key={h}>
              <td className="text-right pr-3 text-muted-foreground text-xs py-0.5 whitespace-nowrap">
                {h}:00
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

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function MeetFlow() {
  // ─── Auth State ──────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // ─── Edit Profile State ───────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState("");

  // ─── App State ────────────────────────────────────────────────────────
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState("xiao-liang");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [copied, setCopied] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("我的會議");

  // ─── Initialize User on Mount ─────────────────────────────────────────
  useEffect(() => {
    const user = loadUser();
    setCurrentUser(user);
    setIsInitialized(true);
  }, []);

  // ─── Auth Functions ───────────────────────────────────────────────────
  function handleLogin() {
    setLoginError("");
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError("請輸入帳號和密碼");
      return;
    }
    const result = validateAccount(loginUsername, loginPassword);
    if (result.success && result.user) {
      const user: AuthUser = {
        id: `user-${Date.now()}`,
        name: result.user.name,
        email: result.user.email,
        username: loginUsername,
        password: loginPassword,
      };
      saveUser(user);
      setCurrentUser(user);
      setLoginUsername("");
      setLoginPassword("");
    } else {
      setLoginError("帳號或密碼錯誤");
    }
  }

  function handleLogout() {
    removeUser();
    setCurrentUser(null);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
  }

  /**
   * 打開編輯個人資料對話框
   */
  function handleEditProfileOpen() {
    if (!currentUser) return;
    setEditName(currentUser.name);
    setEditUsername(currentUser.username);
    setEditPassword(currentUser.password);
    setEditError("");
    setEditOpen(true);
  }

  /**
   * 保存編輯後的個人資料
   */
  function handleSaveProfile() {
    setEditError("");
    const nameTrimmed = editName?.trim() || "";
    const usernameTrimmed = editUsername?.trim() || "";
    const passwordTrimmed = editPassword?.trim() || "";
    
    if (!nameTrimmed || !usernameTrimmed || !passwordTrimmed) {
      setEditError("請填入所有欄位");
      return;
    }

    if (!currentUser) return;

    const updatedUser: AuthUser = {
      ...currentUser,
      name: nameTrimmed,
      username: usernameTrimmed,
      password: passwordTrimmed,
    };

    saveUser(updatedUser);
    setCurrentUser(updatedUser);
    setEditOpen(false);
  }

  /**
   * 處理對話框打開/關閉
   * 打開時自動填入當前用戶名
   */
  function handleDialogOpenChange(isOpen: boolean) {
    if (isOpen && currentUser) {
      setNewName(currentUser.name);
    } else {
      setNewName("");
    }
    setOpen(isOpen);
  }

  // 如果未初始化，不渲染
  if (!isInitialized) {
    return null;
  }

  // ─── If Not Logged In, Show Login Screen ──────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <CalendarCheck className="w-6 h-6" />
              MeetFlow
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              簡單的會議排程工具
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">帳號</label>
              <Input
                placeholder="例：user1, user2, user3"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">密碼</label>
              <Input
                placeholder="abc123"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            {/* ── Error Message ── */}
            {loginError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {loginError}
              </div>
            )}

            {/* ── Demo Accounts ── */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">📝 演示帳號：</p>
              <div className="space-y-1 text-xs text-blue-800 font-mono">
                <p>帳號: user1 | 密碼: abc123</p>
                <p>帳號: user2 | 密碼: abc123</p>
                <p>帳號: user3 | 密碼: abc123</p>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={!loginUsername.trim() || !loginPassword.trim()}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              登入
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const me = members.find((m) => m.id === "me")!;
  const others = members.filter((m) => m.id !== "me");
  const viewing = members.find((m) => m.id === viewId) ?? others[0];

  const commonSlots = DAYS.flatMap((_, d) =>
    HOURS.filter((h) =>
      members.every((m) => m.availability.includes(slot(d, h)))
    ).map((h) => slot(d, h))
  );

  // ─── Meeting Sharing Functions ───────────────────────────────────

  /**
   * 生成唯一的短 ID（格式: XXX-XXX-XXX）
   */
  function generateMeetingId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "";
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 2) id += "-";
    }
    return id;
  }

  /**
   * 生成會議連結
   */
  function generateMeetingLink() {
    const meetingId = generateMeetingId();
    const newMeeting: Meeting = {
      id: meetingId,
      title: meetingTitle,
      createdAt: new Date().toLocaleString("zh-TW"),
      members: members,
      commonSlots: commonSlots,
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    setMeetingTitle("我的會議");
    return meetingId;
  }

  /**
   * 複製連結到剪貼板
   */
  function copyToClipboard(meetingId: string) {
    const url = `${window.location.origin}?meeting=${meetingId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /**
   * 刪除會議
   */
  function deleteMeeting(id: string) {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
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
    };
    setMembers((prev) => [...prev, newMember]);
    setNewName("");
    setOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarCheck className="w-5 h-5" />
            <h1 className="text-lg font-semibold tracking-tight">MeetFlow</h1>
            <Badge variant="secondary" className="text-xs font-normal">
              Beta
            </Badge>
          </div>
          
          {/* ── User Info & Logout ── */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">{currentUser.email}</p>
            </div>
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-primary text-white text-sm font-semibold">
                {currentUser.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* ── Edit Profile Dialog ── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditProfileOpen}
                className="gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">編輯</span>
              </Button>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>編輯個人資料</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">姓名</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="輸入姓名"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">帳號</label>
                    <Input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder={currentUser?.username || "輸入帳號"}
                    />
                    {currentUser && (
                      <p className="text-xs text-muted-foreground mt-1">
                        現在帳號: {currentUser.username}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">密碼</label>
                    <Input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder={currentUser?.password || "輸入密碼"}
                    />
                    {currentUser && (
                      <p className="text-xs text-muted-foreground mt-1">
                        現在密碼: {currentUser.password}
                      </p>
                    )}
                  </div>
                  {editError && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {editError}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditOpen(false)}
                      className="flex-1"
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={!editName || !editUsername || !editPassword}
                      className="flex-1"
                    >
                      保存
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">登出</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-4xl mx-auto px-6 py-8">
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
            <TabsTrigger value="share" className="gap-1.5 text-sm">
              <Link2 className="w-3.5 h-3.5" />
              分享
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Members ── */}
          <TabsContent value="members">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold">成員列表</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  共 {members.length} 位成員
                </p>
              </div>
              <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        預設：{currentUser?.name}（可修改）
                      </p>
                      <Input
                        placeholder="輸入成員名稱"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addMember()}
                        autoFocus
                      />
                    </div>
                    <Button onClick={addMember} disabled={!newName.trim()}>
                      確認加入
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback
                        className={`${m.color} text-white text-sm font-semibold`}
                      >
                        {m.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.availability.length} 個空閒時段
                      </p>
                    </div>
                    {m.id === "me" && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        你
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
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
                選擇成員來查看他們的空閒時段
              </p>
            </div>

            {others.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">
                尚無其他成員，請先在「成員」頁加入
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {others.map((m) => (
                    <Button
                      key={m.id}
                      variant={viewing?.id === m.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewId(m.id)}
                    >
                      {m.name}
                    </Button>
                  ))}
                </div>

                {viewing && (
                  <Card>
                    <CardHeader className="pb-3">
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
                    </CardHeader>
                    <CardContent>
                      <Legend
                        items={[
                          { color: "bg-primary", label: "空閒" },
                          {
                            color: "bg-muted border border-border",
                            label: "忙碌",
                          },
                        ]}
                      />
                      <ScheduleGrid availability={viewing.availability} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab 4: Common Availability ── */}
          <TabsContent value="common">
            <div className="mb-5">
              <h2 className="text-base font-semibold">共同空閒時間</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                所有 {members.length} 位成員都空閒的時段
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Legend
                  items={[
                    { color: "bg-emerald-400", label: "共同空閒" },
                    { color: "bg-muted border border-border", label: "非共同" },
                  ]}
                />
                {commonSlots.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">
                    目前沒有共同空閒時段
                  </p>
                ) : (
                  <ScheduleGrid availability={commonSlots} emerald />
                )}
              </CardContent>
            </Card>

            {commonSlots.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {commonSlots.map((s) => {
                  const [d, h] = s.split("-").map(Number);
                  return (
                    <div
                      key={s}
                      className="text-sm px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
                    >
                      {DAYS[d]} {h}:00–{h + 1}:00
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Tab 5: Share & Meetings ── */}
          <TabsContent value="share">
            <div className="mb-5">
              <h2 className="text-base font-semibold">建立與分享預約連結</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                建立會議連結，分享給他人查看共同空閒時段
              </p>
            </div>

            {/* ── Create Meeting Section ── */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">建立新會議連結</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">會議名稱</label>
                  <Input
                    placeholder="例：2026年3月團隊會議"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                  />
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>✓ {members.length} 位成員</p>
                  <p>✓ {commonSlots.length} 個共同空閒時段</p>
                </div>
                <Button
                  onClick={generateMeetingLink}
                  disabled={!meetingTitle.trim()}
                  className="w-full"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  生成分享連結
                </Button>
              </CardContent>
            </Card>

            {/* ── Generated Meetings ── */}
            {meetings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">已生成的連結</h3>
                {meetings.map((meeting) => {
                  const meetingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}?meeting=${meeting.id}`;
                  return (
                    <Card key={meeting.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{meeting.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ID: <code className="bg-muted px-2 py-1 rounded text-xs">{meeting.id}</code>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              建立於 {meeting.createdAt}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(meeting.id)}
                              className="gap-1.5"
                            >
                              {copied ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  已複製
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  複製
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMeeting(meeting.id)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              刪除
                            </Button>
                          </div>
                        </div>

                        {/* ── Preview Link ── */}
                        <div className="bg-muted p-3 rounded text-xs break-all text-muted-foreground mt-3">
                          {meetingUrl}
                        </div>

                        {/* ── Meeting Stats ── */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                          <div className="text-xs">
                            <p className="text-muted-foreground">成員數</p>
                            <p className="font-semibold text-sm">{meeting.members.length}</p>
                          </div>
                          <div className="text-xs">
                            <p className="text-muted-foreground">共同空閒</p>
                            <p className="font-semibold text-sm">{meeting.commonSlots.length} 個時段</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {meetings.length === 0 && (
              <div className="text-center py-12">
                <Link2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">尚未建立任何會議連結</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
