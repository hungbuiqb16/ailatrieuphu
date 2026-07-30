"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Checkbox,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { useGameData, setToRows, rowsToSet, type Row } from "../GameDataContext";

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      }
    >
      <QuestionsPageContent />
    </Suspense>
  );
}

function QuestionsPageContent() {
  const { loading, saving, data, updateSet, save } = useGameData();
  const searchParams = useSearchParams();
  const setId = searchParams.get("set") || data.activeSetId;

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const set = data.sets.find((s) => s.id === setId);

  if (!set) {
    return <Alert type="error" message="Không tìm thấy bộ câu hỏi. Vui lòng chọn lại ở mục Bộ câu hỏi." />;
  }

  const rows = setToRows(set);

  function setRows(updater: (prev: Row[]) => Row[]) {
    if (!set) return;
    const nextRows = updater(rows);
    updateSet(set.id, (s) => rowsToSet(s, nextRows));
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key).map((r, i) => ({ ...r, key: i })));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        key: prev.length,
        prize: prev.length ? Math.round((prev[prev.length - 1].prize * 1.5) / 1000) * 1000 : 200000,
        safe: false,
        q: "",
        a0: "",
        a1: "",
        a2: "",
        a3: "",
        c: 0,
      },
    ]);
  }

  const columns = [
    {
      title: "STT",
      dataIndex: "key",
      width: 60,
      render: (_: number, r: Row) => r.key + 1,
    },
    {
      title: "Giá trị (đồng)",
      dataIndex: "prize",
      width: 150,
      render: (_: number, r: Row) => (
        <InputNumber
          value={r.prize}
          min={0}
          step={100000}
          style={{ width: "100%" }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          parser={(v) => Number((v || "").replace(/\./g, "")) as unknown as number}
          onChange={(v) => updateRow(r.key, { prize: Number(v) || 0 })}
        />
      ),
    },
    {
      title: "Mốc an toàn",
      dataIndex: "safe",
      width: 100,
      render: (_: boolean, r: Row) => (
        <Checkbox checked={r.safe} onChange={(e) => updateRow(r.key, { safe: e.target.checked })} />
      ),
    },
    {
      title: "Câu hỏi",
      dataIndex: "q",
      width: 260,
      render: (_: string, r: Row) => (
        <Input value={r.q} onChange={(e) => updateRow(r.key, { q: e.target.value })} />
      ),
    },
    {
      title: "Đáp án A/B/C/D",
      width: 340,
      render: (_: unknown, r: Row) => (
        <Space direction="vertical" style={{ width: "100%" }} size={4}>
          {(["a0", "a1", "a2", "a3"] as const).map((key, i) => (
            <Input
              key={key}
              addonBefore={String.fromCharCode(65 + i)}
              value={r[key]}
              onChange={(e) => updateRow(r.key, { [key]: e.target.value } as Partial<Row>)}
            />
          ))}
        </Space>
      ),
    },
    {
      title: "Đáp án đúng",
      dataIndex: "c",
      width: 110,
      render: (_: number, r: Row) => (
        <Select
          value={r.c}
          style={{ width: "100%" }}
          onChange={(v) => updateRow(r.key, { c: v })}
          options={["A", "B", "C", "D"].map((label, i) => ({ label, value: i }))}
        />
      ),
    },
    {
      title: "",
      width: 60,
      render: (_: unknown, r: Row) => (
        <Popconfirm title="Xóa câu hỏi này?" onConfirm={() => removeRow(r.key)}>
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Câu hỏi & thang tiền — {set.name}
      </Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} onClick={addRow}>
          Thêm câu hỏi
        </Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
          Lưu tất cả
        </Button>
      </Space>
      <Table rowKey="key" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 1100 }} />
    </div>
  );
}
