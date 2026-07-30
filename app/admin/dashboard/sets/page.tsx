"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Alert, Button, Input, Modal, Popconfirm, Space, Spin, Table, Tag, Typography, Upload } from "antd";
import {
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ImportOutlined,
  InboxOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useGameData } from "../GameDataContext";
import { CSV_TEMPLATE } from "@/lib/csv";

export default function SetsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { loading, saving, data, createSet, importSetsFromCsv, duplicateSet, deleteSet, renameSet, activateSet } =
    useGameData();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [importing, setImporting] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      message.error("Vui lòng nhập tên bộ câu hỏi");
      return;
    }
    const id = await createSet(name);
    setNewName("");
    setCreating(false);
    router.push(`/admin/dashboard/questions?set=${id}`);
  }

  async function handleActivate(id: string) {
    await activateSet(id);
    message.success("Đã đặt làm bộ câu hỏi đang sử dụng");
  }

  async function handleDelete(id: string) {
    if (data.sets.length <= 1) {
      message.error("Phải còn ít nhất một bộ câu hỏi");
      return;
    }
    await deleteSet(id);
  }

  function resetImportState() {
    setImporting(false);
    setCsvFileName("");
    setCsvText("");
    setImportErrors([]);
  }

  async function handleImport() {
    if (!csvText) {
      message.error("Vui lòng chọn file CSV");
      return;
    }
    const result = await importSetsFromCsv(csvText);
    if (!result.ok) {
      setImportErrors(result.errors);
      return;
    }
    if (result.errors.length > 0) {
      message.warning(`Đã nhập ${result.ids.length} bộ câu hỏi, ${result.errors.length} dòng bị bỏ qua do lỗi định dạng`);
    } else {
      message.success(`Đã nhập ${result.ids.length} bộ câu hỏi từ CSV`);
    }
    resetImportState();
    router.push(`/admin/dashboard/questions?set=${result.ids[0]}`);
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau-bo-cau-hoi.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    {
      title: "Tên bộ câu hỏi",
      dataIndex: "name",
      render: (_: string, s: (typeof data.sets)[number]) => (
        <Typography.Text
          editable={{
            onChange: (value) => {
              renameSet(s.id, value);
            },
          }}
        >
          {s.name}
        </Typography.Text>
      ),
    },
    {
      title: "Số câu hỏi",
      render: (_: unknown, s: (typeof data.sets)[number]) => s.questions.length,
      width: 120,
    },
    {
      title: "Trạng thái",
      width: 160,
      render: (_: unknown, s: (typeof data.sets)[number]) =>
        s.id === data.activeSetId ? <Tag color="gold">Đang sử dụng</Tag> : null,
    },
    {
      title: "Hành động",
      width: 320,
      render: (_: unknown, s: (typeof data.sets)[number]) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => router.push(`/admin/dashboard/questions?set=${s.id}`)}>
            Sửa
          </Button>
          {s.id !== data.activeSetId && (
            <Button icon={<CheckCircleOutlined />} onClick={() => handleActivate(s.id)}>
              Sử dụng
            </Button>
          )}
          <Button
            icon={<CopyOutlined />}
            onClick={async () => {
              await duplicateSet(s.id);
              message.success("Đã nhân bản bộ câu hỏi");
            }}
          >
            Nhân bản
          </Button>
          <Popconfirm title="Xóa bộ câu hỏi này?" onConfirm={() => handleDelete(s.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Bộ câu hỏi
      </Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} loading={saving} onClick={() => setCreating(true)}>
          Tạo bộ mới
        </Button>
        <Button icon={<ImportOutlined />} loading={saving} onClick={() => setImporting(true)}>
          Nhập từ CSV
        </Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={data.sets} pagination={false} />

      <Modal
        title="Tạo bộ câu hỏi mới"
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={handleCreate}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Input
          placeholder="Tên bộ câu hỏi, ví dụ: Bộ Lịch sử"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleCreate}
          autoFocus
        />
      </Modal>

      <Modal
        title="Nhập bộ câu hỏi từ CSV"
        open={importing}
        onCancel={resetImportState}
        onOk={handleImport}
        okText="Nhập"
        cancelText="Hủy"
        confirmLoading={saving}
        width={560}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Upload.Dragger
            accept=".csv"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              setCsvFileName(file.name);
              setImportErrors([]);
              const reader = new FileReader();
              reader.onload = () => setCsvText(String(reader.result || ""));
              reader.readAsText(file, "utf-8");
              return false;
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{csvFileName || "Kéo thả hoặc bấm để chọn file CSV"}</p>
            <p className="ant-upload-hint">
              Cột bắt buộc: set_id, position, question, answer_a, answer_b, answer_c, answer_d, correct_index
              (0-3). Tuỳ chọn: prize, is_safe. Các dòng có cùng set_id sẽ gộp thành một bộ câu hỏi (set_id cũng
              chính là tên bộ).
            </p>
          </Upload.Dragger>

          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
            Tải file mẫu CSV
          </Button>

          {importErrors.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message="Một số dòng không hợp lệ"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {importErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              }
            />
          )}
        </Space>
      </Modal>
    </div>
  );
}
