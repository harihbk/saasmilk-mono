import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    InputNumber,
    Tag,
    Space,
    message,
    Card,
    Typography,
    Statistic,
    Row,
    Col
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    InboxOutlined
} from '@ant-design/icons';
import { assetsAPI } from '../../services/api';

const { Title } = Typography;
const { Option } = Select;

const Assets = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const [form] = Form.useForm();

    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        maintenance: 0
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const response = await assetsAPI.getAssets({ limit: 100 });
            const assetsData = response.data.data.assets || [];
            setAssets(assetsData);

            // Calculate basic stats
            setStats({
                total: assetsData.length,
                active: assetsData.filter(a => a.status === 'active').length,
                maintenance: assetsData.filter(a => a.status === 'maintenance').length
            });
        } catch (error) {
            console.error('Error fetching assets:', error);
            message.error('Failed to fetch assets');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingAsset) {
                await assetsAPI.updateAsset(editingAsset._id, values);
                message.success('Asset updated successfully');
            } else {
                await assetsAPI.createAsset(values);
                message.success('Asset created successfully');
            }
            setModalVisible(false);
            form.resetFields();
            setEditingAsset(null);
            fetchAssets();
        } catch (error) {
            console.error('Error saving asset:', error);
            message.error('Failed to save asset');
        }
    };

    const handleDelete = async (id) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this asset?',
            content: 'This action cannot be undone.',
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    await assetsAPI.deleteAsset(id);
                    message.success('Asset deleted successfully');
                    fetchAssets();
                } catch (error) {
                    console.error('Error deleting asset:', error);
                    message.error('Failed to delete asset');
                }
            }
        });
    };

    const showModal = (asset = null) => {
        setEditingAsset(asset);
        if (asset) {
            form.setFieldsValue(asset);
        } else {
            form.resetFields();
            form.setFieldsValue({
                type: 'crate',
                status: 'active',
                totalQuantity: 0
            });
        }
        setModalVisible(true);
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <span style={{ fontWeight: 'bold' }}>{text}</span>
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color="blue">{type.toUpperCase()}</Tag>
        },
        {
            title: 'Identifier',
            dataIndex: 'identifier',
            key: 'identifier',
        },
        {
            title: 'Total Qty',
            dataIndex: 'totalQuantity',
            key: 'totalQuantity',
        },
        {
            title: 'In Use',
            dataIndex: 'inUseQuantity',
            key: 'inUseQuantity',
            render: (val) => <span style={{ color: '#fa8c16' }}>{val}</span>
        },
        {
            title: 'Available',
            dataIndex: 'availableQuantity',
            key: 'availableQuantity',
            render: (val) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{val}</span>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const colors = { active: 'green', maintenance: 'orange', retired: 'red' };
                return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => showModal(record)}
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record._id)}
                    />
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>Asset Management</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
                    Add Asset
                </Button>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Total Assets"
                            value={stats.total}
                            prefix={<InboxOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Active"
                            value={stats.active}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="In Maintenance"
                            value={stats.maintenance}
                            valueStyle={{ color: '#fa8c16' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Table
                    columns={columns}
                    dataSource={assets}
                    rowKey="_id"
                    loading={loading}
                />
            </Card>

            <Modal
                title={editingAsset ? "Edit Asset" : "Add Asset"}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="name"
                        label="Asset Name"
                        rules={[{ required: true, message: 'Please enter asset name' }]}
                    >
                        <Input placeholder="e.g., Milk Crate 20L" />
                    </Form.Item>

                    <Form.Item
                        name="type"
                        label="Type"
                        rules={[{ required: true, message: 'Please select type' }]}
                    >
                        <Select>
                            <Option value="crate">Crate</Option>
                            <Option value="can">Can</Option>
                            <Option value="pallet">Pallet</Option>
                            <Option value="container">Container</Option>
                            <Option value="other">Other</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="identifier"
                        label="Identifier / Barcode"
                    >
                        <Input placeholder="Unique ID (Optional)" />
                    </Form.Item>

                    <Form.Item
                        name="totalQuantity"
                        label="Total Quantity"
                        rules={[{ required: true, message: 'Please enter quantity' }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="status"
                        label="Status"
                    >
                        <Select>
                            <Option value="active">Active</Option>
                            <Option value="maintenance">Maintenance</Option>
                            <Option value="retired">Retired</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                {editingAsset ? 'Update' : 'Create'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Assets;
