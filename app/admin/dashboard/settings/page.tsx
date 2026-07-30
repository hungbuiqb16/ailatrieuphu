"use client";

import { Button, Card, Form, InputNumber, Space, Spin, Switch } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useGameData } from "../GameDataContext";
import { SectionHeader } from "../SectionHeader";
import type { Lifelines } from "@/lib/gameData";

export default function SettingsPage() {
  const { loading, saving, data, setSettings, save } = useGameData();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const settings = data.settings;

  return (
    <div>
      <SectionHeader
        title="Cài đặt chung"
        description="Thời gian mỗi câu hỏi và các quyền trợ giúp trong game."
        action={
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
            Lưu cài đặt
          </Button>
        }
      />
      <Card style={{ maxWidth: 480 }}>
        <Form layout="vertical">
          <Form.Item label="Thời gian mỗi câu hỏi (giây)">
            <InputNumber
              min={5}
              max={120}
              value={settings.timePerQuestion}
              onChange={(v) => setSettings((s) => ({ ...s, timePerQuestion: Number(v) || 30 }))}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item label="Quyền trợ giúp">
            <Space direction="vertical">
              {(
                [
                  ["f5050", "50:50"],
                  ["phone", "Gọi điện"],
                  ["audience", "Khán giả"],
                ] as [keyof Lifelines, string][]
              ).map(([key, label]) => (
                <Space key={key}>
                  <Switch
                    checked={settings.lifelines[key]}
                    onChange={(checked) =>
                      setSettings((s) => ({ ...s, lifelines: { ...s.lifelines, [key]: checked } }))
                    }
                  />
                  <span>{label}</span>
                </Space>
              ))}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
