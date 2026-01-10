import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Row,
    Col,
    Statistic,
    Tag,
    Button,
    DatePicker,
    Typography,
    Spin,
    Empty
} from 'antd';
import {
    CalendarOutlined,
    UserOutlined
} from '@ant-design/icons';
import { reportsAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const CustomerReport = () => {
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
    const [customerData, setCustomerData] = useState([]);

    // Summary states
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [totalOutstanding, setTotalOutstanding] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await reportsAPI.getCustomerWiseReport({
                startDate: dateRange[0].format('YYYY-MM-DD'),
                endDate: dateRange[1].format('YYYY-MM-DD')
            });

            const data = response.data.data || [];

            // Calculate totals
            const Totals = data.reduce((acc, curr) => ({
                revenue: acc.revenue + (curr.revenue || 0),
                paid: acc.paid + (curr.paid || 0),
                outstanding: acc.outstanding + (curr.outstanding || 0),
                orders: acc.orders + (curr.orders || 0)
            }), { revenue: 0, paid: 0, outstanding: 0, orders: 0 });

            setCustomerData(data);
            setTotalRevenue(Totals.revenue);
            setTotalPaid(Totals.paid);
            setTotalOutstanding(Totals.outstanding);
            setTotalOrders(Totals.orders);

        } catch (error) {
            console.error('Error fetching customer report:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Customer Name',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            responsive: ['md'],
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            responsive: ['md'],
        },
        {
            title: 'Orders',
            dataIndex: 'orders',
            key: 'orders',
            sorter: (a, b) => a.orders - b.orders,
            render: (val) => <Tag color="blue">{val}</Tag>
        },
        {
            title: 'Total Revenue',
            dataIndex: 'revenue',
            key: 'revenue',
            render: (value) => <Text strong>₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => (a.revenue || 0) - (b.revenue || 0),
        },
        {
            title: 'Paid Amount',
            dataIndex: 'paid',
            key: 'paid',
            render: (value) => <Text type="success">₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => (a.paid || 0) - (b.paid || 0),
        },
        {
            title: 'Outstanding',
            dataIndex: 'outstanding',
            key: 'outstanding',
            render: (value) => <Text strong type="danger">₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => (a.outstanding || 0) - (b.outstanding || 0),
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>Customer Wise Report</Title>
                <Text type="secondary">
                    Financial performance breakdown by customer.
                </Text>
            </div>

            <Card style={{ marginBottom: 24 }}>
                <Row gutter={16} align="middle">
                    <Col>
                        <Text strong>Date Range:</Text>
                    </Col>
                    <Col>
                        <RangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            format="YYYY-MM-DD"
                            allowClear={false}
                        />
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            onClick={fetchData}
                            loading={loading}
                            icon={<CalendarOutlined />}
                        >
                            Generate Report
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total Revenue"
                            value={totalRevenue}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total Paid"
                            value={totalPaid}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total Outstanding"
                            value={totalOutstanding}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#f5222d' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total Orders"
                            value={totalOrders}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card title="Customer Details" style={{ marginTop: 24 }}>
                <Table
                    columns={columns}
                    dataSource={customerData}
                    rowKey="customerId"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
};

export default CustomerReport;
