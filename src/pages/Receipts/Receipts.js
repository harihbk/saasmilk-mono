import React, { useState, useEffect, useRef } from 'react';
import {
    Table, Card, Button, Input, Space, DatePicker, Select, Tag, Modal, Form,
    Row, Col, Typography, message, Divider, Radio, InputNumber, Dropdown, Menu
} from 'antd';
import {
    SearchOutlined, PlusOutlined, PrinterOutlined, FilterOutlined,
    ReloadOutlined, EditOutlined, EyeOutlined, FileTextOutlined, DownloadOutlined,
    MoreOutlined, UndoOutlined
} from '@ant-design/icons';
import { receiptsAPI, customersAPI, dealersAPI, invoicesAPI, ordersAPI } from '../../services/api';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Print Component
const ReceiptPrint = React.forwardRef(({ receipt }, ref) => {
    if (!receipt) return null;

    return (
        <div ref={ref} style={{ padding: '40px', fontFamily: 'Inter, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #eee', paddingBottom: '20px' }}>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>PAYMENT RECEIPT</Title>
                <div style={{ color: '#666', marginTop: '5px' }}>Proof of Payment</div>
            </div>

            <Row justify="space-between" align="middle" style={{ marginBottom: '40px' }}>
                <Col>
                    <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Receipt No</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{receipt.receiptNumber}</div>
                </Col>
                <Col style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Date</div>
                    <div style={{ fontSize: '16px' }}>{dayjs(receipt.date).format('DD MMM YYYY')}</div>
                </Col>
            </Row>

            {/* Main Content */}
            <div style={{ backgroundColor: '#f9f9f9', padding: '30px', borderRadius: '8px', marginBottom: '40px' }}>
                <Row gutter={[24, 24]}>
                    <Col span={12}>
                        <div style={{ fontSize: '12px', color: '#888' }}>Received From</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>{receipt.partyName}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px', textTransform: 'capitalize' }}>({receipt.partyType})</div>
                    </Col>
                    <Col span={12} style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#888' }}>Amount Received</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff', marginTop: '4px' }}>
                            ₹{receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                    </Col>
                    <Col span={24}>
                        <Divider style={{ margin: '10px 0' }} />
                    </Col>
                    <Col span={8}>
                        <div style={{ fontSize: '12px', color: '#888' }}>Payment Mode</div>
                        <div style={{ fontSize: '14px', fontWeight: '500', textTransform: 'uppercase' }}>{receipt.paymentMode.replace('_', ' ')}</div>
                    </Col>
                    <Col span={16} style={{ textAlign: 'right' }}>
                        {receipt.transactionReference && receipt.transactionReference !== '-' && (
                            <>
                                <div style={{ fontSize: '12px', color: '#888' }}>Reference / Transaction ID</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>{receipt.transactionReference}</div>
                            </>
                        )}
                    </Col>
                </Row>
            </div>

            {/* Footer Details */}
            {receipt.invoice && (
                <div style={{ marginBottom: '20px' }}>
                    <Text strong>Payment For: </Text>
                    <Text>Invoice #{receipt.invoice.invoiceNumber}</Text>
                </div>
            )}

            {receipt.notes && (
                <div style={{ marginBottom: '60px', fontStyle: 'italic', color: '#666' }}>
                    Note: {receipt.notes}
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '100px', borderTop: '1px solid #eee', paddingTop: '20px', color: '#999', fontSize: '12px' }}>
                <p>This is a computer generated receipt.</p>
            </div>
        </div>
    );
});

const Receipts = () => {
    // State
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [filters, setFilters] = useState({
        search: '',
        status: '',
        dateRange: [],
        paymentMode: '',
        partyType: '',
        partyId: ''
    });

    // Order View State
    const [viewingOrder, setViewingOrder] = useState(null);
    const [viewingOrderReceiptNo, setViewingOrderReceiptNo] = useState(null);
    const [viewOrderModalVisible, setViewOrderModalVisible] = useState(false);


    // Create Modal State
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const [partyOptions, setPartyOptions] = useState([]);
    const [fetchingParties, setFetchingParties] = useState(false);

    // Print Modal State
    const [printModalVisible, setPrintModalVisible] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [partyInvoices, setPartyInvoices] = useState([]); // Invoices for selected party
    const printRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    useEffect(() => {
        fetchReceipts();
    }, [pagination.current, pagination.pageSize, filters]);

    const fetchReceipts = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.current,
                limit: pagination.pageSize,
                search: filters.search,
                paymentMode: filters.paymentMode,
                startDate: filters.startDate?.toISOString(),
                endDate: filters.endDate?.toISOString(),
            };
            const response = await receiptsAPI.getReceipts(params);
            if (response.data.success) {
                setReceipts(response.data.data.receipts);
                setPagination(prev => ({ ...prev, total: response.data.data.pagination.total }));
            }
        } catch (error) {
            console.error('Fetch error:', error);
            message.error('Failed to fetch receipts');
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    const handleSearch = (value) => {
        setFilters(prev => ({ ...prev, search: value }));
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handlePartySearch = async (value) => {
        if (!value) { setPartyOptions([]); return; }
        setFetchingParties(true);
        try {
            // Simplified: Search Customers API (User can extend to Dealers)
            // Ideally we need a unified search or two dropdowns.
            // For neatness, we'll search customers first.
            const response = await customersAPI.getCustomers({ search: value, limit: 5 });
            const customers = response.data.data.customers.map(c => ({
                label: `${c.personalInfo.firstName} ${c.personalInfo.lastName} (${c.customerNumber})`,
                value: c._id,
                type: 'customer'
            }));
            const dealerResponse = await dealersAPI.getDealers({ search: value, limit: 5 });
            const dealers = dealerResponse.data.data.dealers.map(d => ({
                label: `${d.name} (${d.dealerCode})`,
                value: d._id,
                type: 'dealer'
            }));
            setPartyOptions([...customers, ...dealers]);
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingParties(false);
        }
    };

    const [partyOrders, setPartyOrders] = useState([]); // Orders for selected party
    const [paymentType, setPaymentType] = useState('invoice'); // 'invoice' or 'order'

    const handlePartySelect = async (value, option) => {
        setPartyInvoices([]);
        setPartyOrders([]);
        form.setFieldsValue({ invoiceId: null, orderId: null });
        if (!value) return;

        try {
            // Fetch unpaid invoices (issued and partial)
            const resIssued = await invoicesAPI.getInvoices({ buyerId: value, status: 'issued', limit: 50 });
            const resPartial = await invoicesAPI.getInvoices({ buyerId: value, status: 'partial', limit: 50 });

            const issued = resIssued.data?.data?.invoices || [];
            const partial = resPartial.data?.data?.invoices || [];
            setPartyInvoices([...issued, ...partial]);

            // Fetch completed orders for this SPECIFIC buyer
            // Using API filtering ensures we get the right records including older ones if "limit" isn't hit
            const orderParams = {
                status: 'completed',
                limit: 100, // Fetch up to 100 recent completed orders
            };

            // Add specific buyer filter based on selected party type
            // Note: option object structure depends on how we constructed options in handlePartySearch
            // We populated `type: 'customer' | 'dealer'` there.
            if (option.type === 'dealer') {
                orderParams.dealer = value;
            } else {
                orderParams.customer = value;
            }

            const resOrders = await ordersAPI.getOrders(orderParams);

            if (resOrders.data?.success) {
                const allOrders = resOrders.data.data.orders;
                // Filter for Unpaid/Partial locally to be sure (though we could add paymentStatus filter if backend supported it fully)
                // Backend paymentStatus support: yes (pending/partial/completed).
                // We want those NOT completed.
                const unpaidOrders = allOrders.filter(o =>
                    o.payment?.status !== 'completed' && o.payment?.status !== 'refunded'
                );
                setPartyOrders(unpaidOrders);
            }

        } catch (e) {
            console.error("Error fetching party details", e);
        }
    };

    const handleInvoiceSelect = (value) => {
        const inv = partyInvoices.find(i => i._id === value);
        if (inv) {
            const pending = inv.pricing.total - (inv.pricing.paidAmount || 0);
            form.setFieldsValue({ amount: pending });
        }
    };

    const handleOrderSelect = (value) => {
        const ord = partyOrders.find(o => o._id === value);
        if (ord) {
            // Use dueAmount if available, else calc
            const due = ord.payment?.dueAmount !== undefined
                ? ord.payment.dueAmount
                : (ord.pricing.total - (ord.payment?.paidAmount || 0));
            form.setFieldsValue({ amount: due });
        }
    };

    const handleCreate = async (values) => {
        try {
            // Find selected party type
            const selectedOption = partyOptions.find(o => o.value === values.partyId);
            const payload = {
                ...values,
                partyType: selectedOption?.type || 'customer', // fallback
                // Clear the non-selected type
                invoiceId: paymentType === 'invoice' ? values.invoiceId : undefined,
                orderId: paymentType === 'order' ? values.orderId : undefined
            };
            const response = await receiptsAPI.createReceipt(payload);
            if (response.data.success) {
                message.success('Receipt created successfully');
                setCreateModalVisible(false);
                form.resetFields();
                setPaymentType('invoice');
                fetchReceipts();
            }
        } catch (error) {
            message.error('Failed to create receipt');
        }
    };

    const handleConvertInvoice = async (record) => {
        try {
            message.loading({ content: 'Generating Invoice...', key: 'convert' });
            const response = await receiptsAPI.convertInvoice(record._id);
            if (response.data.success) {
                message.success({ content: 'Invoice Generated!', key: 'convert' });
                fetchReceipts();
            } else {
                message.info({ content: response.data.message, key: 'convert' });
            }
        } catch (e) {
            message.error({ content: e.response?.data?.message || 'Failed', key: 'convert' });
        }
    };

    const handleUndo = (record) => {
        Modal.confirm({
            title: 'Undo Receipt?',
            content: `Are you sure you want to undo receipt ${record.receiptNumber}? This will revert the payment and update the balance. This action cannot be undone.`,
            okText: 'Yes, Undo',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    message.loading({ content: 'Undoing receipt...', key: 'undo' });
                    const response = await receiptsAPI.undoReceipt(record._id);
                    if (response.data.success) {
                        message.success({ content: 'Receipt undone successfully', key: 'undo' });
                        fetchReceipts();
                    }
                } catch (error) {
                    message.error({ content: error.response?.data?.message || 'Failed to undo receipt', key: 'undo' });
                }
            }
        });
    };

    const columns = [
        {
            title: 'Receipt No',
            dataIndex: 'receiptNumber',
            key: 'receiptNumber',
            render: text => <Text strong>{text}</Text>
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: date => dayjs(date).format('DD MMM YYYY')
        },
        {
            title: 'Party',
            key: 'party',
            render: (_, record) => (
                <div>
                    <div>{record.partyName}</div>
                    <Tag>{record.partyType}</Tag>
                </div>
            )
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: amount => <Text strong style={{ color: '#1890ff' }}>₹{amount.toFixed(2)}</Text>
        },
        {
            title: 'Mode',
            dataIndex: 'paymentMode',
            key: 'paymentMode',
            render: mode => <Tag color="blue">{mode.toUpperCase().replace('_', ' ')}</Tag>
        },
        {
            title: 'Invoice / Order',
            key: 'ref',
            render: (_, record) => {
                if (record.invoice) return (
                    <Space>
                        <Tag color="geekblue">{record.invoice.invoiceNumber}</Tag>
                    </Space>
                );
                if (record.order) return (
                    <Space>
                        {record.order._id ? (
                            <Tag
                                color="orange"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleViewOrder(record.order._id, record.receiptNumber)}
                                title="Click to view details"
                            >
                                {record.order.orderNumber || 'Order'}
                            </Tag>
                        ) : (
                            <Tag color="orange">{record.order.orderNumber || 'Order'}</Tag>
                        )}
                    </Space>
                );
                return <Text type="secondary">-</Text>;
            }
        },
        {
            title: 'Payment Status',
            key: 'paymentStatus',
            render: (_, record) => {
                let status = 'Pending';
                if (record.order && record.order.payment) {
                    status = record.order.payment.status || 'pending';
                } else if (record.invoice) {
                    status = record.invoice.status || 'issued';
                }

                const color = status === 'completed' || status === 'paid' ? 'green' :
                    status === 'partial' ? 'orange' : 'red';

                return <Tag color={color}>{status.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Payment Due',
            key: 'paymentDue',
            render: (_, record) => {
                let dueAmount = 0;
                if (record.order && record.order.payment) {
                    dueAmount = record.order.payment.dueAmount !== undefined ?
                        record.order.payment.dueAmount :
                        (record.order.pricing?.total || 0) - (record.order.payment.paidAmount || 0);
                } else if (record.invoice && record.invoice.pricing) {
                    dueAmount = (record.invoice.pricing.total || 0) - (record.invoice.pricing.paidAmount || 0);
                }

                return dueAmount > 0 ?
                    <Text type="danger">₹{dueAmount.toFixed(2)}</Text> :
                    <Text type="secondary">₹0.00</Text>;
            }
        },
        {
            title: 'Payment Ref',
            dataIndex: 'transactionReference',
            key: 'reference',
            render: (text) => text && text !== '-' ? text : '-'
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                const menu = (
                    <Menu>
                        <Menu.Item key="view" icon={<EyeOutlined />} onClick={() => {
                            setSelectedReceipt(record);
                            setPrintModalVisible(true);
                        }}>
                            View / Print Poof
                        </Menu.Item>
                        <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => handleEditClick(record)}>
                            Edit Receipt
                        </Menu.Item>
                        {(!record.invoice || !record.invoice._id) && (
                            <Menu.Item key="convert" icon={<FileTextOutlined />} onClick={() => handleConvertInvoice(record)}>
                                Convert to Invoice
                            </Menu.Item>
                        )}
                        <Menu.Item key="undo" danger icon={<UndoOutlined />} onClick={() => handleUndo(record)}>
                            Undo Receipt
                        </Menu.Item>
                    </Menu>
                );

                return (
                    <Dropdown overlay={menu} trigger={['click']}>
                        <Button icon={<MoreOutlined />} size="small" />
                    </Dropdown>
                );
            }
        }
    ];

    // Edit Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState(null);

    // Manual State for Edit Form to guarantee value capture
    const [editData, setEditData] = useState({
        amount: 0,
        paymentMode: 'cash',
        date: null,
        transactionReference: '',
        notes: ''
    });

    const handleEditClick = (record) => {
        setEditingReceipt(record);
        setEditData({
            amount: record.amount,
            paymentMode: record.paymentMode,
            date: dayjs(record.date),
            transactionReference: record.transactionReference || '',
            notes: record.notes || ''
        });
        setEditModalVisible(true);
    };

    const handleUpdate = async () => {
        try {
            const payload = {
                date: editData.date,
                amount: editData.amount,
                paymentMode: editData.paymentMode,
                transactionReference: editData.transactionReference,
                notes: editData.notes
            };

            console.log('Sending Update (Manual State):', payload);
            message.loading({ content: `Updating... Amount: ${payload.amount}, Mode: ${payload.paymentMode}`, key: 'update' });

            const response = await receiptsAPI.updateReceipt(editingReceipt._id, payload);
            if (response.data.success) {
                message.success({ content: 'Receipt updated successfully', key: 'update' });
                setEditModalVisible(false);
                setEditingReceipt(null);
                fetchReceipts();
            }
        } catch (error) {
            message.error({ content: error.response?.data?.message || 'Failed to update receipt', key: 'update' });
        }
    };

    const handleViewOrder = async (orderId, receiptNo) => {
        try {
            const response = await ordersAPI.getOrder(orderId);
            if (response.data.success) {
                setViewingOrder(response.data.data.order);
                setViewingOrderReceiptNo(receiptNo);
                setViewOrderModalVisible(true);
            }
        } catch (error) {
            console.error('Error fetching order details:', error);
            message.error('Failed to load order details');
        }
    };

    const handlePrintOrder = () => {
        const printWindow = window.open('', '_blank');
        const invoiceContent = document.getElementById('order-invoice-content');

        if (printWindow && invoiceContent) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Order Details - ${viewingOrder?.orderNumber || 'N/A'}</title>
                    <style>
                        @media print {
                            @page { margin: 2mm; size: auto; }
                            body { -webkit-print-color-adjust: exact; margin: 0; padding: 5px; }
                            .no-print { display: none !important; }
                        }
                        body { background: white; font-family: 'Courier New', Courier, monospace; }
                        table { border-collapse: collapse; width: 100%; border-bottom: 1px dashed #000; }
                        td, th { padding: 4px; font-size: 10px; text-align: left; border: none; }
                        th { border-bottom: 1px dashed #000; font-weight: bold; }
                        td { border-bottom: 1px dotted #ccc; }
                        .text-right { text-align: right; }
                        .header { text-align: center; margin-bottom: 10px; }
                        .header h2 { margin: 0; font-size: 16px; font-weight: bold; }
                        .header p { margin: 2px 0; font-size: 10px; }
                        .divider { border-top: 1px dashed #000; margin: 5px 0; }
                        .summary { margin-top: 10px; font-size: 10px; }
                        .summary-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                        .total-row { font-weight: bold; font-size: 12px; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                         <h2>${viewingOrder?.dealer?.name || viewingOrder?.customer?.name || 'RECEIPT'}</h2>
                         <p>Order: ${viewingOrder?.orderNumber || '-'}</p>
                         <p>Receipt: ${viewingOrderReceiptNo || '-'}</p>
                         <p>Date: ${dayjs(viewingOrder?.createdAt).format('DD/MM/YYYY hh:mm A')}</p>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40%">Item</th>
                                <th style="width: 15%" class="text-right">Qty</th>
                                <th style="width: 20%" class="text-right">Price</th>
                                <th style="width: 25%" class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${viewingOrder?.items?.map(item => `
                                <tr>
                                    <td>
                                        ${item.productName || item.product?.name}
                                        ${item.product?.packaging?.size?.value ? `<br/><small>${item.product.packaging.size.value}${item.product.packaging.size.unit}</small>` : ''}
                                    </td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">${item.unitPrice?.toFixed(2)}</td>
                                    <td class="text-right">${item.totalPrice?.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="summary">
                         <div class="summary-row">
                             <span>Subtotal</span>
                             <span>${(viewingOrder?.pricing?.subtotal || 0).toFixed(2)}</span>
                         </div>
                         <div class="summary-row">
                             <span>Tax</span>
                             <span>${(viewingOrder?.pricing?.tax || 0).toFixed(2)}</span>
                         </div>
                         ${viewingOrder?.pricing?.discount ? `
                            <div class="summary-row">
                                <span>Discount</span>
                                <span>-${viewingOrder.pricing.discount.toFixed(2)}</span>
                            </div>
                         ` : ''}
                         ${viewingOrder?.pricing?.customAdjustment?.amount > 0 ? `
                            <div class="summary-row">
                                <span>${viewingOrder.pricing.customAdjustment.text || 'Adjustment'}</span>
                                <span>
                                    ${viewingOrder.pricing.customAdjustment.type === 'percentage' ? `(${viewingOrder.pricing.customAdjustment.amount}%) ` : ''}
                                    -${(() => {
                        if (viewingOrder.pricing.customAdjustment.type === 'fixed') return viewingOrder.pricing.customAdjustment.amount.toFixed(2);
                        // Re-calculate percentage value approx base (sub - disc + tax + ship)
                        const base = (viewingOrder.pricing.subtotal || 0) - (viewingOrder.pricing.discount || 0) + (viewingOrder.pricing.tax || 0) + (viewingOrder.pricing.shipping || 0);
                        return ((base * viewingOrder.pricing.customAdjustment.amount) / 100).toFixed(2);
                    })()}
                                </span>
                            </div>
                         ` : ''}
                         <div class="summary-row">
                             <span>Paid Amount</span>
                             <span>₹${(viewingOrder?.payment?.paidAmount || 0).toFixed(2)}</span>
                         </div>
                         <div class="summary-row">
                             <span>Due Amount</span>
                             <span>₹${(viewingOrder?.payment?.dueAmount || 0).toFixed(2)}</span>
                         </div>
                         <div class="summary-row total-row">
                             <span>TOTAL</span>
                             <span>₹${(viewingOrder?.pricing?.total || 0).toFixed(2)}</span>
                         </div>
                         <div class="summary-row" style="margin-top: 5px; font-weight: bold; justify-content: center;">
                             <span>Status: ${(viewingOrder?.payment?.status || 'Pending').toUpperCase()}</span>
                         </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; font-size: 10px;">
                        <p>Thank You!</p>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    const calculateOrderDetailsHelper = (items) => {
        if (!items) return { totalLitres: 0, totalKg: 0, packageBreakdown: {} };
        let totalLitres = 0;
        let totalKg = 0;
        const packageBreakdown = {};

        items.forEach(item => {
            const product = item.product || {};
            const quantity = item.quantity || 0;

            if (product.packaging && ['crate', 'carton', 'bag', 'box'].includes(product.packaging.type)) {
                packageBreakdown[product.packaging.type] = (packageBreakdown[product.packaging.type] || 0) + quantity;
            }

            if (product.packaging?.size?.value) {
                let volume = parseFloat(product.packaging.size.value);
                const unit = product.packaging.size.unit?.toLowerCase();
                let multiplier = 1;

                if (['crate', 'carton', 'bag', 'box'].includes(product.packaging?.type) && product.unit) {
                    const parsedUnit = parseFloat(product.unit);
                    if (!isNaN(parsedUnit)) multiplier = parsedUnit;
                }

                const totalSize = volume * multiplier * quantity;

                if (unit === 'ml') totalLitres += totalSize / 1000;
                else if (['l', 'liter', 'liters'].includes(unit)) totalLitres += totalSize;
                else if (['g', 'gram', 'grams'].includes(unit)) totalKg += totalSize / 1000;
                else if (['kg', 'kilogram', 'kilograms'].includes(unit)) totalKg += totalSize;
            }
        });

        return { totalLitres, totalKg, packageBreakdown };
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Payment Receipts</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                    setCreateModalVisible(true);
                    setPaymentType('invoice');
                    form.resetFields();
                }}>
                    Create Receipt
                </Button>
            </div>

            <Card style={{ marginBottom: 24 }}>
                <Row gutter={16} align="middle">
                    <Col span={8}>
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="Search Number, Party, Ref..."
                            onChange={e => handleSearch(e.target.value)}
                        />
                    </Col>
                    <Col span={6}>
                        <RangePicker
                            onChange={(dates) => {
                                setFilters(prev => ({
                                    ...prev,
                                    startDate: dates ? dates[0] : null,
                                    endDate: dates ? dates[1] : null
                                }));
                            }}
                        />
                    </Col>
                    <Col span={4}>
                        <Select
                            placeholder="Payment Mode"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={val => setFilters(prev => ({ ...prev, paymentMode: val }))}
                        >
                            <Option value="cash">Cash</Option>
                            <Option value="upi">UPI</Option>
                            <Option value="bank_transfer">Bank Transfer</Option>
                            <Option value="cheque">Cheque</Option>
                        </Select>
                    </Col>
                    <Col span={2}>
                        <Button icon={<ReloadOutlined />} onClick={fetchReceipts} />
                    </Col>
                </Row>
            </Card>

            <Table
                columns={[...columns, {
                    title: 'Edit',
                    key: 'edit',
                    width: 60,
                    render: (_, record) => (
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            disabled={record.status === 'cancelled'}
                            onClick={() => handleEditClick(record)}
                        />
                    )
                }]}
                dataSource={receipts}
                rowKey="_id"
                pagination={pagination}
                loading={loading}
                onChange={handleTableChange}
            />

            {/* Create Modal */}
            <Modal
                title="Create Receipt"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="date" label="Date" initialValue={dayjs()} rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="partyId" label="Received From" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            placeholder="Search Customer/Dealer"
                            filterOption={false}
                            onSearch={handlePartySearch}
                            onSelect={handlePartySelect}
                            notFoundContent={fetchingParties ? 'Searching...' : null}
                            options={partyOptions}
                        />
                    </Form.Item>

                    <Form.Item label="Payment Against">
                        <Radio.Group value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                            <Radio value="invoice">Invoice</Radio>
                            <Radio value="order">Order (Completed)</Radio>
                        </Radio.Group>
                    </Form.Item>

                    {paymentType === 'invoice' ? (
                        <Form.Item name="invoiceId" label="Link to Invoice">
                            <Select placeholder="Select Invoice to Pay" allowClear onChange={handleInvoiceSelect} disabled={!partyInvoices.length}>
                                {partyInvoices.map(inv => {
                                    const pending = inv.pricing.total - (inv.pricing.paidAmount || 0);
                                    return (
                                        <Option key={inv._id} value={inv._id}>
                                            {inv.invoiceNumber} - Pending: ₹{pending.toFixed(2)} (Total: ₹{inv.pricing.total})
                                        </Option>
                                    );
                                })}
                            </Select>
                        </Form.Item>
                    ) : (
                        <Form.Item name="orderId" label="Link to Order">
                            <Select placeholder="Select Completed Order" allowClear onChange={handleOrderSelect} disabled={!partyOrders.length}>
                                {partyOrders.map(ord => {
                                    const due = ord.payment?.dueAmount ?? (ord.pricing.total - (ord.payment?.paidAmount || 0));
                                    return (
                                        <Option key={ord._id} value={ord._id}>
                                            {ord.orderNumber} - Due: ₹{due.toFixed(2)} (Total: ₹{ord.pricing.total.toFixed(2)})
                                        </Option>
                                    );
                                })}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                        <Input prefix="₹" type="number" />
                    </Form.Item>

                    <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]}>
                        <Select>
                            <Option value="Not Paid">Not Paid</Option>
                            <Option value="cash">Cash</Option>
                            <Option value="upi">UPI</Option>
                            <Option value="bank_transfer">Bank Transfer</Option>
                            <Option value="cheque">Cheque</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="transactionReference" label="Reference / Transaction ID">
                        <Input placeholder="e.g. Cheque No, UPI Ref" />
                    </Form.Item>

                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block>Generate Receipt</Button>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title="Edit Receipt"
                open={editModalVisible}
                destroyOnClose={true}
                onCancel={() => {
                    setEditModalVisible(false);
                    setEditingReceipt(null);
                    editForm.resetFields();
                }}
                footer={null}
            >
                <Form layout="vertical">
                    <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                        <Text strong>Receipt No: </Text> <Text>{editingReceipt?.receiptNumber}</Text><br />
                        <Text strong>Party: </Text> <Text>{editingReceipt?.partyName}</Text>
                    </div>

                    <Form.Item label="Date" required>
                        <DatePicker
                            style={{ width: '100%' }}
                            value={editData.date}
                            onChange={d => setEditData(prev => ({ ...prev, date: d }))}
                        />
                    </Form.Item>

                    <Form.Item label="Amount" required>
                        <InputNumber
                            style={{ width: '100%' }}
                            value={editData.amount}
                            onChange={val => setEditData(prev => ({ ...prev, amount: val }))}
                        />
                        <div style={{ fontSize: '11px', color: 'orange', marginTop: 4 }}>
                            Warning: Changing amount will update linked Invoice/Order and Party balance.
                        </div>
                    </Form.Item>

                    <Form.Item label="Payment Mode" required>
                        <Select
                            value={editData.paymentMode}
                            onChange={val => setEditData(prev => ({ ...prev, paymentMode: val }))}
                        >
                            <Option value="Not Paid">Not Paid</Option>
                            <Option value="cash">Cash</Option>
                            <Option value="upi">UPI</Option>
                            <Option value="bank_transfer">Bank Transfer</Option>
                            <Option value="cheque">Cheque</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item label="Reference / Transaction ID">
                        <Input
                            value={editData.transactionReference}
                            onChange={e => setEditData(prev => ({ ...prev, transactionReference: e.target.value }))}
                            placeholder="e.g. Cheque No, UPI Ref"
                        />
                    </Form.Item>

                    <Form.Item label="Notes">
                        <Input.TextArea
                            value={editData.notes}
                            onChange={e => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </Form.Item>

                    <Button type="primary" onClick={handleUpdate} block>Update Receipt</Button>
                </Form>
            </Modal>

            {/* Print Modal */}
            <Modal
                title="Print Receipt"
                open={printModalVisible}
                onCancel={() => setPrintModalVisible(false)}
                width={850}
                footer={[
                    <Button key="close" onClick={() => setPrintModalVisible(false)}>Close</Button>,
                    <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                ]}
            >
                <div style={{ backgroundColor: '#fff', padding: '20px' }}>
                    <ReceiptPrint ref={printRef} receipt={selectedReceipt} />
                </div>
            </Modal>
            {/* View Order Modal */}
            <Modal
                title={
                    <Space>
                        <FileTextOutlined /> Order Details / Invoice
                        <Button
                            type="primary"
                            icon={<PrinterOutlined />}
                            onClick={handlePrintOrder}
                            size="small"
                        >
                            Print
                        </Button>
                    </Space>
                }
                open={viewOrderModalVisible}
                onCancel={() => setViewOrderModalVisible(false)}
                footer={null}
                width={900}
                bodyStyle={{ padding: 0 }}
            >
                {viewingOrder && (
                    <>
                        {/* Print Container Hidden from Screen but used by handlePrintOrder via ID */}
                        <div id="order-invoice-content" style={{ padding: '20px', backgroundColor: '#fff' }}>
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <Title level={3} style={{ margin: 0 }}>ORDER / INVOICE</Title>
                                <Text type="secondary">#{viewingOrder.orderNumber}</Text>
                                {viewingOrderReceiptNo && (
                                    <div style={{ marginTop: 5 }}>
                                        <Tag color="green">Receipt: {viewingOrderReceiptNo}</Tag>
                                    </div>
                                )}
                            </div>

                            <Row gutter={24}>
                                <Col span={12}>
                                    <div style={{ marginBottom: 4 }}><Text type="secondary">Date:</Text> <Text strong>{viewingOrder.createdAt ? dayjs(viewingOrder.createdAt).format('MMM DD, YYYY') : 'N/A'}</Text></div>
                                    <div style={{ marginBottom: 4 }}><Text type="secondary">Status:</Text> <Tag>{viewingOrder.status?.toUpperCase() || 'UNKNOWN'}</Tag></div>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                    {viewingOrder.dealer && (
                                        <>
                                            <div style={{ fontWeight: 'bold' }}>{viewingOrder.dealer.name}</div>
                                            <div>{viewingOrder.dealer.dealerGroup?.name}</div>
                                        </>
                                    )}
                                    {viewingOrder.customer && (
                                        <>
                                            <div style={{ fontWeight: 'bold' }}>{viewingOrder.customer.name}</div>
                                            <div>{viewingOrder.customer.email}</div>
                                        </>
                                    )}
                                </Col>
                            </Row>

                            <Divider />

                            <Table
                                dataSource={viewingOrder.items}
                                pagination={false}
                                size="small"
                                bordered
                                rowKey={(r, i) => i}
                                columns={[
                                    {
                                        title: 'Product',
                                        key: 'product',
                                        render: (_, r) => <div>
                                            <div>{r.productName || r.product?.name}</div>
                                            {r.product?.packaging?.size?.value && (
                                                <Tag style={{ fontSize: '10px' }}>{r.product.packaging.size.value}{r.product.packaging.size.unit}</Tag>
                                            )}
                                        </div>
                                    },
                                    { title: 'Qty', dataIndex: 'quantity', align: 'center' },
                                    { title: 'Price', dataIndex: 'unitPrice', align: 'right', render: v => `₹${v?.toFixed(2)}` },
                                    {
                                        title: 'Tax',
                                        key: 'tax',
                                        align: 'right',
                                        render: (_, r) => (
                                            <div style={{ fontSize: '11px' }}>
                                                <div>₹{((r.igstAmount || 0) + (r.cgstAmount || 0) + (r.sgstAmount || 0) + (r.taxAmount || 0)).toFixed(2)}</div>
                                                <div style={{ color: '#888', fontSize: '9px' }}>
                                                    {r.cgst > 0 && `CGST: ${r.cgst}% `}
                                                    {r.sgst > 0 && `SGST: ${r.sgst}% `}
                                                    {r.igst > 0 && `IGST: ${r.igst}% `}
                                                </div>
                                            </div>
                                        )
                                    },
                                    { title: 'Total', dataIndex: 'totalPrice', align: 'right', render: v => `₹${v?.toFixed(2)}` }
                                ]}
                            />

                            <Row justify="end" style={{ marginTop: 24 }}>
                                <Col span={10}>
                                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                                        <Text>Subtotal:</Text>
                                        <Text>₹{(viewingOrder.pricing?.subtotal || 0).toFixed(2)}</Text>
                                    </Row>
                                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                                        <Text>Tax:</Text>
                                        <Text>₹{(viewingOrder.pricing?.tax || 0).toFixed(2)}</Text>
                                    </Row>
                                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                                        <Text>Discount:</Text>
                                        <Text type="danger">-₹{(viewingOrder.pricing?.discount || 0).toFixed(2)}</Text>
                                    </Row>
                                    {viewingOrder.pricing?.customAdjustment?.amount > 0 && (
                                        <Row justify="space-between" style={{ marginBottom: 8 }}>
                                            <Text>{viewingOrder.pricing.customAdjustment.text || 'Adjustment'}:</Text>
                                            <Text type="danger">
                                                {viewingOrder.pricing.customAdjustment.type === 'percentage' && `(${viewingOrder.pricing.customAdjustment.amount}%) `}
                                                -₹{(() => {
                                                    if (viewingOrder.pricing.customAdjustment.type === 'fixed') return viewingOrder.pricing.customAdjustment.amount.toFixed(2);
                                                    const base = (viewingOrder.pricing.subtotal || 0) - (viewingOrder.pricing.discount || 0) + (viewingOrder.pricing.tax || 0) + (viewingOrder.pricing.shipping || 0);
                                                    return ((base * viewingOrder.pricing.customAdjustment.amount) / 100).toFixed(2);
                                                })()}
                                            </Text>
                                        </Row>
                                    )}
                                    <Divider style={{ margin: '8px 0' }} />
                                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                                        <Text>Paid Amount:</Text>
                                        <Text>₹{(viewingOrder.payment?.paidAmount || 0).toFixed(2)}</Text>
                                    </Row>
                                    <Row justify="space-between" style={{ marginBottom: 8 }}>
                                        <Text>Due Amount:</Text>
                                        <Text type="danger">₹{(viewingOrder.payment?.dueAmount || 0).toFixed(2)}</Text>
                                    </Row>
                                    <Row justify="space-between">
                                        <Text strong style={{ fontSize: '16px' }}>Total:</Text>
                                        <Text strong style={{ fontSize: '16px' }}>₹{(viewingOrder.pricing?.total || 0).toFixed(2)}</Text>
                                    </Row>
                                    <Row justify="center" style={{ marginTop: 12 }}>
                                        <Tag color={
                                            viewingOrder.payment?.status === 'completed' ? 'green' :
                                                viewingOrder.payment?.status === 'partial' ? 'orange' : 'red'
                                        } style={{ fontSize: '14px', padding: '4px 8px' }}>
                                            {(viewingOrder.payment?.status || 'PENDING').toUpperCase()}
                                        </Tag>
                                    </Row>
                                </Col>
                            </Row>

                            {/* Package Summary */}
                            {(() => {
                                const { totalLitres, totalKg, packageBreakdown } = calculateOrderDetailsHelper(viewingOrder.items);
                                if (totalLitres === 0 && totalKg === 0 && Object.keys(packageBreakdown).length === 0) return null;
                                return (
                                    <div style={{ marginTop: 20, borderTop: '1px dashed #eee', paddingTop: 10 }}>
                                        <Text strong>Summary: </Text>
                                        {totalLitres > 0 && <Tag color="blue">{totalLitres.toFixed(2)} L</Tag>}
                                        {totalKg > 0 && <Tag color="purple">{totalKg.toFixed(2)} Kg</Tag>}
                                        {Object.entries(packageBreakdown).map(([k, v]) => (
                                            <Tag key={k} color="cyan">{v} {k}s</Tag>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default Receipts;
