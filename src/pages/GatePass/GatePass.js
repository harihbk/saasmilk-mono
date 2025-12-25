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
    Popconfirm,
    Divider
} from 'antd';
import {
    PlusOutlined,
    ExportOutlined,
    ImportOutlined,
    PrinterOutlined,
    DeleteOutlined,
    EditOutlined
} from '@ant-design/icons';
import { gatePassesAPI, assetsAPI, companiesAPI, fleetAPI, usersAPI, ordersAPI } from '../../services/api';
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
    const [activeOutwardPasses, setActiveOutwardPasses] = useState([]);
    const [selectedOutwardPass, setSelectedOutwardPass] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPass, setEditingPass] = useState(null);
    const [orders, setOrders] = useState([]);
    const [form] = Form.useForm();

    useEffect(() => {
        if (activeTab === 'outward') {
            fetchOrders();
        } else {
            fetchActiveOutwardPasses();
        }
    }, [activeTab]);

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
            // Try fetching with 'Driver' (common role name) - backend handles case insensitivity now
            const response = await usersAPI.getUsers({ role: 'Driver', limit: 100 });
            setDrivers(response.data.data.users || []);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const fetchOrders = async () => {
        try {
            // Fetch both confirmed and completed orders
            // Filter out already "outwarded" orders
            const response = await ordersAPI.getOrders({
                status: 'confirmed,completed,ready,packed,processing',
                limit: 100,
                outward: 'false'
            });
            setOrders(response.data.data.orders || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const fetchActiveOutwardPasses = async () => {
        try {
            const response = await gatePassesAPI.getOutwardActive();
            console.log('Outward Active Response:', response.data);
            const passes = response.data.data.passes || [];
            console.log('Setting Active Outward Passes:', passes);
            setActiveOutwardPasses(passes);
        } catch (error) {
            console.error('Error fetching outward passes:', error);
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
            // If Inward, items are Assets. If Outward with Orders, items are Orders.
            let formattedAssets = [];
            let orderIds = [];
            let payloadItems = [];

            if (activeTab === 'outward') {
                // Outward: Calculate assets from selected orders (scaled by user edit)
                const assetBreakdown = {}; // { 'crate': 10, 'box': 5 }

                values.items.forEach(item => {
                    if (item.orderId) {
                        orderIds.push(item.orderId);
                        const order = orders.find(o => o._id === item.orderId);

                        if (order) {
                            // Get theoretical breakdown
                            const { totalPackages, rawBreakdown } = calculateOrderPackages(order);

                            // User edited quantity
                            const userQty = Number(item.quantity) || 0;

                            // Calculate scale factor (if totalPackages is 0, avoid NaN)
                            const scale = totalPackages > 0 ? (userQty / totalPackages) : (userQty > 0 ? 1 : 0);

                            // Apply scale to each type in breakdown
                            Object.entries(rawBreakdown).forEach(([type, count]) => {
                                // Scale and round (ceil) to ensure enough capacity
                                const scaledCount = Math.ceil(count * scale);

                                if (scaledCount > 0) {
                                    assetBreakdown[type] = (assetBreakdown[type] || 0) + scaledCount;

                                    // Push detailed item for backend hook
                                    payloadItems.push({
                                        order: order._id,
                                        packageType: type,
                                        quantity: scaledCount,
                                        notes: `Manifest Qty: ${userQty} (Scaled from ${totalPackages})`
                                    });
                                }
                            });

                            // Fallback: If calculation yielded 0 but user entered quantity, default to 'crate' or first type
                            if (Object.keys(rawBreakdown).length === 0 && userQty > 0) {
                                const defaultType = 'crate';
                                assetBreakdown[defaultType] = (assetBreakdown[defaultType] || 0) + userQty;
                                payloadItems.push({
                                    order: order._id,
                                    packageType: defaultType,
                                    quantity: userQty,
                                    notes: `Manual Entry: ${userQty}`
                                });
                            }
                        }
                    }
                });

                // Map breakdown keys (crate, box) to Asset IDs
                formattedAssets = Object.entries(assetBreakdown).map(([type, count]) => {
                    // Find asset with matching type (case-insensitive) or name
                    const asset = assets.find(a =>
                        (a.type && a.type.toLowerCase() === type) ||
                        (a.name && a.name.toLowerCase().includes(type))
                    );
                    if (asset) {
                        return { asset: asset._id, quantity: count };
                    }
                    return null;
                }).filter(Boolean);

                if (formattedAssets.length === 0 && orderIds.length > 0) {
                    // Fallback handled by backend validation or empty array
                }

            } else {
                // Inward: Items are manually selected Assets (pending returns logic uses assetId)
                formattedAssets = values.items.map(item => ({
                    asset: item.assetId,
                    quantity: item.quantity
                }));
            }

            const payload = {
                ...values,
                type: activeTab,
                assets: formattedAssets,
                orders: orderIds
            };

            // For Outward, we send the detailed items manifest for the hook
            if (activeTab === 'outward') {
                payload.items = payloadItems;
            } else {
                delete payload.items;
            }

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
            console.error('Error saving gate pass:', error);
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
        const selectedVehicle = vehicles.find(v => v._id === value);

        if (selectedVehicle && selectedVehicle.assignedDriver) {
            let driverId = null;
            let driverPhone = '';
            let shouldSelectDriver = false;

            if (typeof selectedVehicle.assignedDriver === 'object') {
                // Populated object
                driverId = selectedVehicle.assignedDriver._id;
                driverPhone = selectedVehicle.assignedDriver.phone || '';
            } else {
                // ID string
                driverId = selectedVehicle.assignedDriver;
            }

            // Check if this driver is in our dropdown list
            const driverInList = drivers.find(d => d._id === driverId);

            if (driverInList) {
                shouldSelectDriver = true;
                // Prefer info from list if needed, but phone from vehicle population is fine
                if (!driverPhone && driverInList.phone) {
                    driverPhone = driverInList.phone;
                }
            } else if (!driverPhone && driverId) {
                // If we have ID but no phone (and not in list), try to fetch to at least get phone
                try {
                    const userRes = await usersAPI.getUser(driverId);
                    if (userRes.data?.data?.user) {
                        driverPhone = userRes.data.data.user.phone || '';
                    }
                } catch (err) {
                    console.error('Failed to fetch driver details', err);
                }
            }

            // Only set the Driver Name dropdown if it exists in the list (avoids ID display)
            if (shouldSelectDriver) {
                form.setFieldsValue({ driver: driverId });
            } else {
                form.setFieldsValue({ driver: null }); // Clear if not in list
            }

            // Always set the phone if we found it
            form.setFieldsValue({ driverPhone: driverPhone });
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
        const selectedDriver = drivers.find(d => d._id === value);
        if (selectedDriver) {
            form.setFieldsValue({
                driverPhone: selectedDriver.phone || ''
            });
        }
    };

    const handleOutwardPassChange = async (passId) => {
        const pass = activeOutwardPasses.find(p => p._id === passId);
        if (pass) {
            setSelectedOutwardPass(pass);
            form.setFieldsValue({ referenceGatePass: pass._id });

            // Auto-fill Vehicle
            if (pass.vehicle) {
                // Handle populated object or ID
                const vehicleId = typeof pass.vehicle === 'object' ? pass.vehicle._id : pass.vehicle;
                form.setFieldsValue({ vehicle: vehicleId });
                // Trigger vehicle change logic if needed, or just set driver
                handleVehicleChange(vehicleId); // This might autofill driver if linked
            }

            // Auto-fill Driver (override vehicle's default if specific driver was on pass)
            if (pass.driver) {
                const driverId = typeof pass.driver === 'object' ? pass.driver._id : pass.driver;
                const driverPhone = typeof pass.driver === 'object' ? pass.driver.phone : pass.driverPhone;
                form.setFieldsValue({
                    driver: driverId,
                    driverPhone: driverPhone
                });
            }

            // Auto-fill Assets (Fetch calculated pending quantities)
            try {
                const response = await gatePassesAPI.getPendingReturns({ gatePassId: pass._id });
                const data = response.data.data;

                if (data && data.items && data.items.length > 0) {
                    const formItems = data.items.map(item => ({
                        assetId: item.assetId,
                        quantity: item.quantity, // Calculated remaining quantity
                        notes: ''
                    }));
                    form.setFieldsValue({ items: formItems });
                    message.success(`Loaded items from Pass ${data.passNumber} (Remaining Quantities)`);
                } else {
                    // Fallback to original assets if no calculation returned (e.g. fully returned)
                    // Or maybe show empty?
                    // If fully returned, items array is empty.
                    if (pass.assets && pass.assets.length > 0) {
                        // Optional: Warn user it's fully returned?
                        // "No pending items found (Fully Returned?)"
                        form.setFieldsValue({ items: [] });
                        message.info('This pass appears to be fully returned already.');
                    }
                }
            } catch (error) {
                console.error('Error calculating pending returns:', error);
                // Fallback to local data
                if (pass.assets && pass.assets.length > 0) {
                    const formItems = pass.assets.map(a => ({
                        assetId: a.asset._id || a.asset,
                        quantity: a.quantity,
                        notes: 'Fallback (Original Qty)'
                    }));
                    form.setFieldsValue({ items: formItems });
                }
            }
        } else {
            setSelectedOutwardPass(null);
            form.resetFields(['vehicle', 'driver', 'driverPhone', 'items']);
        }
    };

    const handlePrint = (pass) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            message.error('Please allow popups to print');
            return;
        }

        const vehicleNo =
            pass.vehicle?.vehicleNumber ||
            pass.vehicleNumber ||
            pass.vehicle ||
            '-';

        const driverName =
            pass.driver?.name ||
            pass.driverName ||
            '-';

        const driverPhone =
            pass.driver?.phone ||
            pass.driverPhone ||
            '-';

        const ordersText = pass.orders?.length
            ? pass.orders.map(o => o.orderNumber).join(', ')
            : pass.order?.orderNumber || '-';

        const itemsHtml = pass.assets.map(item => `
    <tr>
      <td>${item.asset?.name || 'Unknown'}</td>
      <td style="text-align:right">${item.quantity}</td>
    </tr>
  `).join('');

        // Restore Logo and Address Logic
        const logoHtml = company?.settings?.theme?.logo
            ? `<div style="text-align:center; margin-bottom:5px;"><img src="${company.settings.theme.logo}" style="max-width:50mm; max-height:20mm;" /></div>`
            : `<h2 style="text-align:center; margin-bottom:5px;">${company?.name || 'MILK COMPANY'}</h2>`;

        const address = company?.contactInfo?.address || {};
        const addressHtml = [
            address.street,
            address.city,
            address.state,
            address.postalCode
        ].filter(Boolean).join(', ') || '';

        const phoneHtml = company?.contactInfo?.phone ? `<div style="text-align:center; font-size:10px;">Phone: ${company.contactInfo.phone}</div>` : '';


        const html = `
  <html>
    <head>
      <title>Gate Pass ${pass.passNumber}</title>
      <style>
        body { font-family: monospace; width: 80mm; font-size: 12px; }
        .row { display:flex; justify-content:space-between; margin:4px 0 }
        table { width:100%; border-collapse: collapse }
        th, td { border-bottom:1px solid #000; padding:4px }
        .divider { border-top:1px dashed #000; margin:8px 0 }
      </style>
    </head>
    <body>
      ${logoHtml}
      ${!company?.settings?.theme?.logo ? '' : `<div style="text-align:center; font-weight:bold; margin-bottom:2px;">${company?.name}</div>`}
      <div style="text-align:center; font-size:10px; margin-bottom:2px;">${addressHtml}</div>
      ${phoneHtml}

      <div class="divider"></div>

      <h3 style="text-align:center; margin:10px 0;">${pass.type === 'outward' ? 'OUTWARD' : 'INWARD'} GATE PASS</h3>

      <div class="row"><b>Pass No</b><span>${pass.passNumber}</span></div>
      <div class="row"><b>Date</b><span>${dayjs(pass.createdAt).format('DD/MM/YYYY HH:mm')}</span></div>

      <div class="divider"></div>

      <div class="row"><b>Vehicle</b><span>${vehicleNo}</span></div>
      <div class="row"><b>Driver</b><span>${driverName}</span></div>
      <div class="row"><b>Phone</b><span>${driverPhone}</span></div>

      <div class="divider"></div>

      <div><b>Orders:</b> ${ordersText}</div>

      <table style="margin-top:5px;">
        <thead>
          <tr>
            <th>Asset</th>
            <th style="text-align:right">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <div><b>Notes:</b> ${pass.notes || '-'}</div>

      <br/>
      <div style="display:flex;justify-content:space-between;margin-top:40px">
        <div>Issued By</div>
        <div>Received By</div>
      </div>
      
      <div style="text-align:center; font-size:10px; margin-top:20px;">
        Powered by MilkERP
      </div>

      <script>
        window.onload = () => window.print();
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
                    <div style={{ fontSize: '11px', color: '#666' }}>
                        {record.orders && record.orders.length > 0 ? (
                            <span>Orders: {record.orders.map(o => o.orderNumber).join(', ')}</span>
                        ) : (
                            <span>{record.order?.orderNumber}</span>
                        )}
                        {record.referenceGatePass && (
                            <div style={{ color: '#1890ff' }}>
                                Ref: {record.referenceGatePass.passNumber || record.referenceGatePass}
                            </div>
                        )}
                    </div>
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
                    <div><span style={{ fontWeight: '500' }}>{record.vehicle?.vehicleNumber || record.vehicle || 'No Vehicle'}</span></div>
                    <div style={{ fontSize: '12px' }}>
                        {record.driver?.name || record.driverName || 'No Driver'}
                        {(record.driver?.phone || record.driverPhone) && ` (${record.driver?.phone || record.driverPhone})`}
                    </div>
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
                        onClick={() => {
                            setEditingPass(record);

                            // Merge existing orders into the dropdown options so IDs resolve
                            if (record.orders && record.orders.length > 0) {
                                setOrders(prev => {
                                    const existingIds = new Set(prev.map(o => o._id));
                                    const newOrders = record.orders.filter(o => !existingIds.has(o._id));
                                    return [...prev, ...newOrders];
                                });
                            }
                            // Also handle single order field legacy
                            else if (record.order) {
                                setOrders(prev => {
                                    if (prev.find(o => o._id === record.order._id)) return prev;
                                    return [...prev, record.order];
                                });
                            }

                            setModalVisible(true);
                            // Pre-fill form (handle populated fields by passing IDs)
                            form.setFieldsValue({
                                ...record,
                                items: record.type === 'outward'
                                    ? (record.items || []).map(i => ({ orderId: i.order?._id || i.order, ...i }))
                                    : (record.assets || []).map(a => ({ assetId: a.asset?._id || a.asset, quantity: a.quantity })),
                                vehicle: record.vehicle?._id || record.vehicle,
                                driver: record.driver?._id || record.driver
                            });
                        }}
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



    // Helper to calculate total packages from an order
    const calculateOrderPackages = (order) => {
        if (!order || !order.items) return { totalPackages: 0, breakdown: '', rawBreakdown: {} };

        let totalPackages = 0;
        const rawBreakdown = {};

        order.items.forEach(item => {
            const product = item.product;
            const quantity = item.quantity || 0;

            if (product && product.packaging && ['crate', 'carton', 'bag', 'box', 'can', 'bottle'].includes(product.packaging.type)) {
                // Determine pack count logic (similar to handleSubmit logic)
                let packCount = quantity;
                const parsedUnit = parseFloat(product.unit);
                const isOrderInPacks = !isNaN(parsedUnit) && parsedUnit > 1;

                if (!isOrderInPacks) {
                    const packSize = product.packaging.size?.value || 1;
                    if (packSize > 1) {
                        packCount = Math.ceil(quantity / packSize);
                    }
                }

                totalPackages += packCount;
                const type = product.packaging.type;
                rawBreakdown[type] = (rawBreakdown[type] || 0) + packCount;
            }
        });

        const breakdownText = Object.entries(rawBreakdown)
            .map(([type, count]) => `${count} ${type}(s)`)
            .join(', ');

        return { totalPackages, breakdown: breakdownText, rawBreakdown };
    };

    const handleOrderSelectInItem = (orderId, fieldKey) => {
        const order = orders.find(o => o._id === orderId);
        if (order) {
            const { totalPackages, breakdown } = calculateOrderPackages(order);

            // We need to update the form fields for this item row
            const items = form.getFieldValue('items');
            Object.assign(items[fieldKey], {
                packageType: breakdown || 'Standard',
                quantity: totalPackages,
                notes: `Order #${order.orderNumber}`
            });
            form.setFieldsValue({ items });
        }
    };



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
                    {/* Hidden field for reference pass ID */}
                    <Form.Item name="referenceGatePass" hidden>
                        <Input />
                    </Form.Item>

                    {/* Inward: Select Outward Pass (Moved to Top) */}
                    {activeTab === 'inward' && (
                        <div style={{ marginBottom: 24, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8, background: '#e6f7ff' }}>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>Select Outward Gate Pass to Return</div>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                                Selecting a pass will auto-fill Vehicle, Driver, and Pending Items.
                            </div>
                            <Select
                                placeholder="Select Outward Pass"
                                style={{ width: '100%' }}
                                allowClear
                                onChange={handleOutwardPassChange}
                            >
                                {activeOutwardPasses.map(op => (
                                    <Option key={op._id} value={op._id}>
                                        {op.passNumber} - {op.vehicle?.vehicleNumber || 'No Vehicle'} ({dayjs(op.createdAt).format('DD MMM')})
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {/* Vehicle & Driver Details (Visible for BOTH Outward and Inward) */}
                    <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                        <div style={{ marginBottom: 16, fontWeight: 'bold', color: '#555' }}>Transport Details</div>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item
                                    name="vehicle"
                                    label="Vehicle Number"
                                    rules={[{ required: true, message: 'Please select vehicle' }]}
                                >
                                    <Select
                                        placeholder="Select Vehicle"
                                        showSearch
                                        optionFilterProp="children"
                                        onChange={handleVehicleChange}
                                    >
                                        {vehicles.map(v => (
                                            <Option key={v._id} value={v._id}>
                                                {v.vehicleNumber} ({v.vehicleType})
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item
                                    name="driver"
                                    label="Driver Name"
                                    rules={[{ required: true, message: 'Please select driver' }]}
                                >
                                    <Select
                                        placeholder="Select Driver"
                                        showSearch
                                        optionFilterProp="children"
                                        onChange={handleDriverChange}
                                    >
                                        {drivers.map(d => (
                                            <Option key={d._id} value={d._id}>
                                                {d.name} {d.phone ? `(${d.phone})` : ''}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                {/* Phone is now derived from driver selection, shown for reference */}
                                <Form.Item
                                    name="driverPhone"
                                    label="Driver Phone"
                                >
                                    <Input readOnly placeholder="Auto-filled" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {activeTab === 'outward' ? <Divider orientation="left">Order Manifest</Divider> : <Divider orientation="left">Return Items</Divider>}

                    <Form.List name="items"
                        InitialValue={[]}
                    >
                        {(fields, { add, remove }) => (
                            <>


                                {fields.map(({ key, name, ...restField }) => (
                                    <div key={key} style={{ display: 'flex', marginBottom: 8, border: '1px solid #eee', padding: '10px', borderRadius: '4px', alignItems: 'center' }}>
                                        {activeTab === 'outward' ? (
                                            <>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'orderId']}
                                                    label="Select Order"
                                                    style={{ width: 300, marginBottom: 0, marginRight: 10 }}
                                                    rules={[{ required: true, message: 'Missing order' }]}
                                                >
                                                    <Select
                                                        placeholder="Select Order"
                                                        onChange={(val) => handleOrderSelectInItem(val, name)}
                                                        showSearch
                                                        optionFilterProp="children"
                                                    >
                                                        {orders.map(o => (
                                                            <Option key={o._id} value={o._id}>
                                                                {o.orderNumber} ({o.status})
                                                            </Option>
                                                        ))}
                                                    </Select>
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'packageType']}
                                                    label="Package Details"
                                                    style={{ width: 200, marginBottom: 0, marginRight: 10 }}
                                                >
                                                    <Input readOnly placeholder="e.g. 5 Crates" />
                                                </Form.Item>
                                            </>
                                        ) : (
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'assetId']}
                                                label="Select Asset"
                                                style={{ width: 300, marginBottom: 0, marginRight: 10 }}
                                                rules={[{ required: true, message: 'Missing asset' }]}
                                            >
                                                <Select
                                                    placeholder="Select Asset"
                                                    showSearch
                                                    optionFilterProp="children"
                                                >
                                                    {assets.map(a => (
                                                        <Option key={a._id} value={a._id}>
                                                            {a.name} ({a.type})
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        )}

                                        <Form.Item
                                            {...restField}
                                            name={[name, 'quantity']}
                                            label="Total Qty"
                                            style={{ width: 100, marginBottom: 0, marginRight: 10 }}
                                        >
                                            <InputNumber min={0} placeholder="Qty" style={{ width: '100%' }} />
                                        </Form.Item>
                                        <DeleteOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer', marginLeft: 'auto' }} />
                                    </div>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Add Order to Manifest
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>

                    <Form.Item
                        name="notes"
                        label="Trip Notes"
                        style={{ marginTop: 16 }}
                    >
                        <Input.TextArea rows={2} placeholder="Any additional instructions..." />
                    </Form.Item>

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
