import React, { useEffect, useState } from "react";
import { Table, Input, Button, message, Tag, Typography, Space, Card } from "antd";
import { SaveOutlined, ReloadOutlined } from "@ant-design/icons";
import { autoStockAPI } from "../../../services/api";

const { Title } = Typography;

const AutoStockTab = () => {
  const [data, setData] = useState([]);
  const [changedRows, setChangedRows] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await autoStockAPI.getAll();
      setData(res.data.data || []);
      setChangedRows({});
    } catch (err) {
      console.error(err);
      message.error("Failed to load Auto Stock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Track updates
  const handleQtyChange = (value, record) => {
    if (value < 0) {
      message.warning("Quantity cannot be negative");
      return;
    }

    setChangedRows((prev) => ({
      ...prev,
      [record.productId]: { productId: record.productId, quantity: value }
    }));
  };

  // Bulk save
  const handleSaveAll = async () => {
    if (Object.keys(changedRows).length === 0) {
      message.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      await autoStockAPI.bulkUpdate(Object.values(changedRows));

      message.success("Stock updated successfully!");
      fetchData();
    } catch (err) {
      console.error(err);
      message.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "SKU",
      dataIndex: "sku",
      width: 120,
      render: (sku) => <Tag color="blue">{sku}</Tag>,
    },
    {
      title: "Product Name",
      dataIndex: "name",
      width: 200,
      render: (name) => <b>{name}</b>,
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      width: 150,
      render: (value, record) => (
        <Input
          type="number"
          min={0}
          defaultValue={value}
          onChange={(e) =>
            handleQtyChange(Number(e.target.value), record)
          }
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Unit",
      dataIndex: "unit",
      width: 100,
      render: (u) => u || "-",
    }
  ];

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Auto Stock Management
        </Title>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={Object.keys(changedRows).length === 0}
            onClick={handleSaveAll}
          >
            Save All
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey={(r) => r.productId}
        loading={loading}
        pagination={{ pageSize: 10 }}
        bordered
      />
    </Card>
  );
};

export default AutoStockTab;
