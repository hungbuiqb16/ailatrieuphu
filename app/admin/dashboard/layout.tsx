"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { App, Avatar, Button, Layout, Menu } from "antd";
import {
  DatabaseOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { GameDataProvider } from "./GameDataContext";

const { Sider, Header, Content } = Layout;

const MENU_ITEMS = [
  { key: "/admin/dashboard/sets", icon: <DatabaseOutlined />, label: "Bộ câu hỏi" },
  { key: "/admin/dashboard/questions", icon: <QuestionCircleOutlined />, label: "Câu hỏi & thang tiền" },
  { key: "/admin/dashboard/settings", icon: <SettingOutlined />, label: "Cài đặt chung" },
];

function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div
          style={{
            height: 56,
            margin: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 8,
            color: "#FFC93C",
            fontWeight: 800,
            fontSize: collapsed ? 20 : 16,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <TrophyOutlined />
          {!collapsed && <span>AI LÀ TRIỆU PHÚ</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={MENU_ITEMS.map((item) => ({
            ...item,
            label: <Link href={item.key}>{item.label}</Link>,
          }))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 16px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((c) => !c)}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar icon={<UserOutlined />} />
            <span>Quản trị viên</span>
            <Button icon={<LogoutOutlined />} onClick={logout}>
              Đăng xuất
            </Button>
          </div>
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{ padding: 24, background: "#fff", borderRadius: 8, minHeight: "100%" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <App>
      <GameDataProvider>
        <DashboardShell>{children}</DashboardShell>
      </GameDataProvider>
    </App>
  );
}
