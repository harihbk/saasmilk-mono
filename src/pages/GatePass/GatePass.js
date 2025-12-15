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
    Tabs,
    Row,
    Col,
    Popconfirm
} from 'antd';
import {
    PlusOutlined,
    ExportOutlined,
    ImportOutlined,
    PrinterOutlined,
    DeleteOutlined,
    EditOutlined
} from '@ant-design/icons';
import { gatePassesAPI, assetsAPI, companiesAPI, fleetAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const GatePass = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('outward');
    const [passes, setPasses] = useState([]);
    const [assets, setAssets] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPass, setEditingPass] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchGatePasses();
        fetchAssets();
        fetchVehicles();
        fetchDrivers();
        fetchCompanyProfile();
    }, [activeTab]);

    const fetchCompanyProfile = async () => {
        if (user?.company) {
            try {
                const companyId = user.company.id || user.company;
                const response = await companiesAPI.getCompany(companyId);
                setCompany(response.data.data.company);
            } catch (error) {
                console.error("Error fetching company profile:", error);
            }
        }
    };

    const fetchVehicles = async () => {
        try {
            const response = await fleetAPI.getVehicles({ status: 'active', limit: 100 });
            setVehicles(response.data.data.vehicles || []);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
        }
    };

    const fetchDrivers = async () => {
        try {
            const response = await usersAPI.getUsers({ role: 'driver', limit: 100 });
            setDrivers(response.data.data.users || []);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const fetchAssets = async () => {
        try {
            const response = await assetsAPI.getAssets({ limit: 100, status: 'active' });
            setAssets(response.data.data.assets || []);
        } catch (error) {
            console.error('Error fetching assets:', error);
        }
    };

    const fetchGatePasses = async () => {
        setLoading(true);
        try {
            const response = await gatePassesAPI.getGatePasses({
                limit: 100,
                type: activeTab
            });
            setPasses(response.data.data.passes || []);
        } catch (error) {
            console.error('Error fetching passes:', error);
            message.error('Failed to fetch gate passes');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            const formattedAssets = values.items.map(item => ({
                asset: item.assetId,
                quantity: item.quantity
            }));

            const payload = {
                ...values,
                type: activeTab,
                assets: formattedAssets
            };

            delete payload.items;

            if (editingPass) {
                await gatePassesAPI.updateGatePass(editingPass._id, payload);
                message.success('Gate Pass updated successfully');
            } else {
                await gatePassesAPI.createGatePass(payload);
                message.success('Gate Pass created successfully');
            }

            setModalVisible(false);
            setEditingPass(null);
            form.resetFields();
            fetchGatePasses();
            fetchAssets();
        } catch (error) {
            console.error('Error saving pass:', error);
            message.error(error.response?.data?.message || 'Failed to save gate pass');
        }
    };

    const handleDelete = async (id) => {
        try {
            await gatePassesAPI.deleteGatePass(id);
            message.success('Gate Pass deleted successfully');
            fetchGatePasses();
            fetchAssets();
        } catch (error) {
            console.error('Error deleting pass:', error);
            message.error(error.response?.data?.message || 'Failed to delete gate pass');
        }
    };

    const showEditModal = (pass) => {
        setEditingPass(pass);
        form.setFieldsValue({
            vehicle: pass.vehicle,
            driverName: pass.driverName,
            driverPhone: pass.driverPhone,
            notes: pass.notes,
            items: pass.assets.map(a => ({
                assetId: a.asset._id || a.asset,
                quantity: a.quantity
            }))
        });
        setModalVisible(true);
    };

    const handleVehicleChange = async (value) => {
        const selectedVehicle = vehicles.find(v => v.vehicleNumber === value);
        if (selectedVehicle && selectedVehicle.assignedDriver) {
            // Check if assignedDriver is populated object or ID
            if (typeof selectedVehicle.assignedDriver === 'object') {
                form.setFieldsValue({
                    driverName: selectedVehicle.assignedDriver.name,
                    driverPhone: selectedVehicle.assignedDriver.phone || ''
                });
            }
        }

        // Auto-fill pending items for Inward pass
        if (activeTab === 'inward' && value) {
            try {
                // Use dedicated endpoint that calculates partial returns
                const response = await gatePassesAPI.getPendingReturns({ vehicle: value });
                const data = response.data.data;

                if (data && data.items && data.items.length > 0) {
                    message.info(`Found pending items from Pass ${data.passNumber}. Auto-filling.`);

                    const items = data.items.map(item => ({
                        assetId: item.assetId,
                        quantity: item.quantity
                    }));

                    form.setFieldsValue({
                        items: items,
                        notes: `Return against Pass: ${data.passNumber}`
                    });
                } else {
                    message.info('No pending items found for this vehicle.');
                    form.setFieldsValue({ items: [] });
                }
            } catch (error) {
                console.error('Error fetching pending returns:', error);
            }
        }
    };

    const handleDriverChange = (value) => {
        const selectedDriver = drivers.find(d => d.name === value);
        if (selectedDriver) {
            form.setFieldsValue({
                driverPhone: selectedDriver.phone || ''
            });
        }
    }

    const handlePrint = (pass) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            message.error('Please allow popups to print');
            return;
        }

        const itemsHtml = pass.assets.map(item => `
            <tr>
                <td style="padding: 4px; border-bottom: 1px solid #ddd;">${item.asset?.name || 'Unknown'}</td>
                <td style="padding: 4px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
            </tr>
        `).join('');

        const logoHtml = company?.settings?.theme?.logo
            ? `<div style="text-align:center; margin-bottom:5px;"><img src="${company.settings.theme.logo}" style="max-width:50mm; max-height:20mm;" /></div>`
            : `<h2>${company?.name || 'MILK COMPANY'}</h2>`;

        const address = company?.contactInfo?.address || {};
        const addressHtml = [
            address.street,
            address.city,
            address.state,
            address.postalCode
        ].filter(Boolean).join(', ') || '123 Dairy Road, Milk City';

        const phoneHtml = company?.contactInfo?.phone ? `<p>Phone: ${company.contactInfo.phone}</p>` : '';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gate Pass ${pass.passNumber}</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        width: 80mm;
                        margin: 0;
                        padding: 10px;
                        font-size: 12px;
                    }
                    .header { text-align: center; margin-bottom: 10px; }
                    .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
                    .header p { margin: 2px 0; font-size: 10px; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                    .label { font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                    th { text-align: left; border-bottom: 1px solid #000; padding: 4px; font-size: 10px; }
                    .footer { margin-top: 30px; text-align: center; font-size: 10px; }
                    .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
                    .sig-block { border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 5px; }
                    @media print {
                        @page { margin: 0; size: 80mm auto; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    ${logoHtml}
                    ${!company?.settings?.theme?.logo ? '' : `<p style="font-weight:bold;">${company?.name}</p>`}
                    <p>${addressHtml}</p>
                    ${phoneHtml}
                    <div class="divider"></div>
                    <h3>${pass.type === 'outward' ? 'OUTWARD GATE PASS' : 'INWARD GATE PASS'}</h3>
                </div>

                <div class="info-row">
                    <span class="label">Pass No:</span>
                    <span>${pass.passNumber}</span>
                </div>
                <div class="info-row">
                    <span class="label">Date:</span>
                    <span>${dayjs(pass.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                </div>
                <div class="divider"></div>
                
                <div class="info-row">
                    <span class="label">Vehicle No:</span>
                    <span>${pass.vehicle || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Driver:</span>
                    <span>${pass.driverName || '-'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Phone:</span>
                    <span>${pass.driverPhone || '-'}</span>
                </div>
                
                <table style="margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>Asset Item</th>
                            <th style="text-align: right;">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="divider"></div>
                <div style="font-size: 10px;">
                    <span class="label">Notes:</span> ${pass.notes || '-'}
                </div>

                <div class="signatures">
                    <div class="sig-block">Issued By</div>
                    <div class="sig-block">Receiver</div>
                </div>

                <div class="footer">
                    <p>Thank you for your business</p>
                    <p>Powered by MilkERP</p>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const columns = [
        {
            title: 'Pass Info',
            key: 'passInfo',
            render: (_, record) => (
                <div>
                    <div><span style={{ fontWeight: 'bold' }}>{record.passNumber}</span></div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                        {dayjs(record.createdAt).format('DD MMM, HH:mm')}
                    </div>
                </div>
            )
        },
        {
            title: 'Transport Details',
            key: 'transport',
            render: (_, record) => (
                <div>
                    <div><span style={{ fontWeight: '500' }}>{record.vehicle || 'No Vehicle'}</span></div>
                    <div style={{ fontSize: '12px' }}>{record.driverName} {record.driverPhone && `(${record.driverPhone})`}</div>
                </div>
            )
        },
        {
            title: 'Assets',
            key: 'assets',
            render: (_, record) => (
                <Space direction="vertical" size="small">
                    {record.assets?.map((item, idx) => (
                        <Tag key={idx}>
                            {item.asset?.name}: {item.quantity}
                        </Tag>
                    ))}
                </Space>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <Tag color={status === 'active' ? 'blue' : 'green'}>{status.toUpperCase()}</Tag>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        icon={<PrinterOutlined />}
                        onClick={() => handlePrint(record)}
                        title="Print Pass"
                    />
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => showEditModal(record)}
                        title="Edit Pass"
                    />
                    <Popconfirm
                        title="Delete Gate Pass?"
                        description="This will revert item quantities."
                        onConfirm={() => handleDelete(record._id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            title="Delete Pass"
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
                <Title level={2}>Gate Pass Management</Title>
                <Button
                    type="primary"
                    icon={activeTab === 'outward' ? <ExportOutlined /> : <ImportOutlined />}
                    onClick={() => setModalVisible(true)}
                >
                    Create {activeTab === 'outward' ? 'Outward' : 'Inward'} Pass
                </Button>
            </div>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="Outward Gate Passes" key="outward" />
                <TabPane tab="Inward Gate Passes" key="inward" />
            </Tabs>

            <Card>
                <Table
                    columns={columns}
                    dataSource={passes}
                    rowKey="_id"
                    loading={loading}
                />
            </Card>

            <Modal
                title={editingPass ? `Edit ${activeTab === 'outward' ? 'Outward' : 'Inward'} Pass` : (activeTab === 'outward' ? "New Outward Gate Pass" : "New Inward Gate Pass")}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    setEditingPass(null);
                    form.resetFields();
                }}
                footer={null}
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="vehicle"
                                label="Vehicle Number"
                            >
                                <Select
                                    placeholder="Select Vehicle"
                                    showSearch
                                    optionFilterProp="children"
                                    onChange={handleVehicleChange}
                                >
                                    {vehicles.map(v => (
                                        <Option key={v._id} value={v.vehicleNumber}>
                                            {v.vehicleNumber} ({v.vehicleType})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="driverName"
                                label="Driver Name"
                            >
                                <Select
                                    placeholder="Select Driver"
                                    showSearch
                                    optionFilterProp="children"
                                    onChange={handleDriverChange}
                                >
                                    {drivers.map(d => (
                                        <Option key={d._id} value={d.name}>
                                            {d.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="driverPhone"
                                label="Driver Phone"
                            >
                                <Input placeholder="Phone Number" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="notes"
                        label="Notes / Reference"
                    >
                        <Input placeholder="Additional notes, Dealer Name, etc." />
                    </Form.Item>

                    <Form.List name="items">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'assetId']}
                                            rules={[{ required: true, message: 'Missing asset' }]}
                                        >
                                            <Select placeholder="Select Asset" style={{ width: 250 }}>
                                                {assets.map(a => (
                                                    <Option key={a._id} value={a._id} disabled={activeTab === 'outward' && a.availableQuantity <= 0}>
                                                        {a.name} (Avail: {a.availableQuantity})
                                                    </Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'quantity']}
                                            rules={[{ required: true, message: 'Missing quantity' }]}
                                        >
                                            <InputNumber min={1} placeholder="Qty" style={{ width: 100 }} />
                                        </Form.Item>
                                        <DeleteOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer' }} />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Add Asset Item
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>

                    <Form.Item style={{ textAlign: 'right', marginTop: 16 }}>
                        <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit">
                            Generate {activeTab === 'outward' ? 'Outward' : 'Inward'} Pass
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default GatePass;
