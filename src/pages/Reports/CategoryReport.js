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
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip
} from 'recharts';
import {
    BarChartOutlined,
    CalendarOutlined,
    PieChartOutlined,
    DollarOutlined
} from '@ant-design/icons';
import { reportsAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Vibrant contrasting colors for the charts
const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
    '#8884d8', '#82ca9d', '#fa541c', '#2f54eb',
    '#eb2f96', '#722ed1', '#52c41a', '#13c2c2'
];

const CategoryReport = () => {
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
    const [categoryData, setCategoryData] = useState([]);

    // Summary states
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalTax, setTotalTax] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await reportsAPI.getCategoryWiseReport({
                startDate: dateRange[0].format('YYYY-MM-DD'),
                endDate: dateRange[1].format('YYYY-MM-DD')
            });

            const data = response.data.data || [];

            // Calculate totals from the pre-aggregated data
            const Totals = data.reduce((acc, curr) => ({
                revenue: acc.revenue + (curr.value || 0),
                tax: acc.tax + (curr.tax || 0),
                discount: acc.discount + (curr.discount || 0),
                items: acc.items + (curr.quantity || 0)
            }), { revenue: 0, tax: 0, discount: 0, items: 0 });

            // Add percentage to each category
            const processedData = data.map(cat => ({
                ...cat,
                percentage: Totals.revenue > 0 ? ((cat.value / Totals.revenue) * 100).toFixed(2) : 0
            }));

            setCategoryData(processedData);
            setTotalRevenue(Totals.revenue);
            setTotalTax(Totals.tax);
            setTotalDiscount(Totals.discount);
            setTotalItems(Totals.items);

        } catch (error) {
            console.error('Error fetching category report:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Category',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Discount',
            dataIndex: 'discount',
            key: 'discount',
            render: (value) => <Text type="danger">₹{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => a.discount - b.discount,
        },
        {
            title: 'Taxable Value',
            dataIndex: 'value',
            key: 'value',
            render: (value) => <Text>₹{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => a.value - b.value,
        },
        {
            title: 'Tax',
            dataIndex: 'tax',
            key: 'tax',
            render: (value) => <Text type="secondary">₹{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => a.tax - b.tax,
        },
        {
            title: 'Total Amount',
            dataIndex: 'collected',
            key: 'collected',
            render: (value) => <Text strong type="warning">₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => (a.collected || 0) - (b.collected || 0),
        },
        {
            title: 'Total Cost',
            dataIndex: 'cost',
            key: 'cost',
            render: (value) => <Text type="secondary">₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => (a.cost || 0) - (b.cost || 0),
        },
        {
            title: 'Net Profit',
            dataIndex: 'netSales',
            key: 'netSales',
            render: (value) => <Text strong type="success">₹{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => a.netSales - b.netSales,
        },
        {
            title: '% Total',
            dataIndex: 'percentage',
            key: 'percentage',
            render: (val) => <Tag color="blue">{val}%</Tag>,
            sorter: (a, b) => parseFloat(a.percentage) - parseFloat(b.percentage),
        },
        {
            title: 'Qty',
            dataIndex: 'quantity',
            key: 'quantity',
            sorter: (a, b) => a.quantity - b.quantity,
        },
        {
            title: 'Orders',
            dataIndex: 'orderCount',
            key: 'orderCount',
            render: (count) => <Tag color="purple">{count}</Tag>,
            sorter: (a, b) => a.orderCount - b.orderCount,
        }
    ];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <p className="label" style={{ fontWeight: 'bold' }}>{payload[0].name}</p>
                    <p className="intro" style={{ color: '#1890ff' }}>
                        Revenue: ₹{payload[0].value.toLocaleString()}
                    </p>
                    <p className="desc" style={{ color: '#666' }}>
                        ({((payload[0].value / totalRevenue) * 100).toFixed(1)}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    // Find top categories
    const topRevenueCat = categoryData.length > 0 ? categoryData[0] : null;
    const mostPopularCat = categoryData.length > 0
        ? [...categoryData].sort((a, b) => b.orderCount - a.orderCount)[0]
        : null;

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>Category Wise Sales Report</Title>
                <Text type="secondary">
                    Detailed breakdown of sales performance by category (Server Aggregated).
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
                {/* Summary Statistics */}
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total Income"
                            value={totalRevenue}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#3f8600' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total Tax Collected"
                            value={totalTax}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#cf1322' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total Discounts"
                            value={totalDiscount}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total Items Sold"
                            value={totalItems}
                            prefix={<BarChartOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {categoryData.length > 0 ? (
                <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                    {/* Charts Section */}
                    <Col xs={24} lg={12}>
                        <Card title="Revenue Distribution (Pie Chart)" style={{ height: '100%' }}>
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={120}
                                            fill="#8884d8"
                                            dataKey="value"
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                if (percent < 0.05) return null; // Don't show labels for small slices
                                                return `${(percent * 100).toFixed(0)}%`;
                                            }}
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend layout="vertical" align="right" verticalAlign="middle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        <Card title="Revenue by Category (Bar Chart)" style={{ height: '100%' }}>
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer>
                                    <BarChart
                                        data={categoryData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} />
                                        <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                        <Bar dataKey="value" fill="#8884d8">
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>

                    {/* Detailed Table */}
                    <Col span={24}>
                        <Card title="Detailed Breakdown">
                            <Table
                                columns={columns}
                                dataSource={categoryData}
                                rowKey="name"
                                pagination={false}
                            />
                        </Card>
                    </Col>
                </Row>
            ) : (
                <Card style={{ marginTop: 24, textAlign: 'center' }}>
                    {loading ? <Spin /> : <Empty description="No data found for the selected date range" />}
                </Card>
            )}
        </div>
    );
};
export default CategoryReport;
