"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { App, Avatar, Button, ConfigProvider, Layout, Menu } from "antd";
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

const BRAND_RED = "#E8394A";

const MENU_ITEMS = [
  { key: "/admin/dashboard/sets", icon: <DatabaseOutlined style={{ color: "#FF9E1B" }} />, label: "Bộ câu hỏi" },
  {
    key: "/admin/dashboard/questions",
    icon: <QuestionCircleOutlined style={{ color: "#2EC4B6" }} />,
    label: "Câu hỏi & thang tiền",
  },
  { key: "/admin/dashboard/settings", icon: <SettingOutlined style={{ color: "#582B9E" }} />, label: "Cài đặt chung" },
];

function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={0}
        onBreakpoint={setIsMobile}
        theme="light"
        style={{ borderRight: "1px solid #f0f0f0", position: "fixed", height: "100vh", left: 0, top: 0, zIndex: 10 }}
      >
        <div
          style={{
            height: 56,
            margin: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 8,
            color: BRAND_RED,
            fontWeight: 800,
            fontSize: 16,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <TrophyOutlined />
          <span>AI LÀ TRIỆU PHÚ</span>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[pathname]}
          onClick={() => isMobile && setCollapsed(true)}
          items={MENU_ITEMS.map((item) => ({
            ...item,
            label: <Link href={item.key}>{item.label}</Link>,
          }))}
        />
      </Sider>
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9 }}
        />
      )}
      <Layout style={{ marginLeft: isMobile ? 0 : collapsed ? 0 : 200, transition: "margin-left 0.2s" }}>
        <Header
          style={{
            padding: "0 12px",
            background: "#fff",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((c) => !c)}
          />
          <div className="flex items-center gap-2 sm:gap-4">
            <Avatar style={{ backgroundColor: BRAND_RED }} icon={<UserOutlined />} />
            <span className="hidden sm:inline">Quản trị viên</span>
            <Button icon={<LogoutOutlined />} onClick={logout}>
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </Header>
        <Content className="m-2 sm:m-4">
          <div className="p-3 sm:p-6" style={{ background: "#fff", borderRadius: 8, minHeight: "100%" }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: BRAND_RED,
          colorLink: BRAND_RED,
        },
      }}
    >
      <App>
        <GameDataProvider>
          <DashboardShell>{children}</DashboardShell>
        </GameDataProvider>
      </App>
    </ConfigProvider>
  );
}
