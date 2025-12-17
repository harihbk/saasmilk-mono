import React, { useState, useEffect, useRef } from 'react';
import {
    Table, Card, Button, Input, Space, DatePicker, Select, Tag, Modal, Form,
    Row, Col, Typography, message, Divider
} from 'antd';
import {
    SearchOutlined, PlusOutlined, PrinterOutlined, FilterOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { receiptsAPI, customersAPI, dealersAPI, invoicesAPI } from '../../services/api';
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
                        {receipt.transactionReference && (
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
        paymentMode: null,
        startDate: null,
        endDate: null
    });

    // Create Modal State
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [form] = Form.useForm();
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

    const handlePartySelect = async (value, option) => {
        setPartyInvoices([]);
        form.setFieldsValue({ invoiceId: null });
        if (!value) return;

        try {
            // Fetch unpaid invoices (issued and partial)
            const resIssued = await invoicesAPI.getInvoices({ buyerId: value, status: 'issued', limit: 50 });
            const resPartial = await invoicesAPI.getInvoices({ buyerId: value, status: 'partial', limit: 50 });

            const issued = resIssued.data?.data?.invoices || [];
            const partial = resPartial.data?.data?.invoices || [];

            setPartyInvoices([...issued, ...partial]);
        } catch (e) {
            console.error("Error fetching invoices", e);
        }
    };

    const handleInvoiceSelect = (value) => {
        const inv = partyInvoices.find(i => i._id === value);
        if (inv) {
            const pending = inv.pricing.total - (inv.pricing.paidAmount || 0);
            form.setFieldsValue({ amount: pending });
        }
    };

    const handleCreate = async (values) => {
        try {
            // Find selected party type
            const selectedOption = partyOptions.find(o => o.value === values.partyId);
            const payload = {
                ...values,
                partyType: selectedOption?.type || 'customer' // fallback
            };
            const response = await receiptsAPI.createReceipt(payload);
            if (response.data.success) {
                message.success('Receipt created successfully');
                setCreateModalVisible(false);
                form.resetFields();
                fetchReceipts();
            }
        } catch (error) {
            message.error('Failed to create receipt');
        }
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
            title: 'Invoice #',
            dataIndex: 'invoice',
            key: 'invoice',
            render: (invoice) => invoice ? <Tag color="geekblue">{invoice.invoiceNumber}</Tag> : <Text type="secondary">-</Text>
        },
        {
            title: 'Payment Ref',
            dataIndex: 'transactionReference',
            key: 'reference',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button
                    icon={<PrinterOutlined />}
                    size="small"
                    onClick={() => {
                        setSelectedReceipt(record);
                        setPrintModalVisible(true);
                    }}
                >
                    Proof
                </Button>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Payment Receipts</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
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
                columns={columns}
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

                    <Form.Item name="invoiceId" label="Link to Invoice (Optional)">
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

                    <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                        <Input prefix="₹" type="number" />
                    </Form.Item>

                    <Form.Item name="paymentMode" label="Payment Mode" rules={[{ required: true }]}>
                        <Select>
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
        </div>
    );
};

export default Receipts;
