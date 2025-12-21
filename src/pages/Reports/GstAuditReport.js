import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Row,
    Col,
    Statistic,
    Button,
    DatePicker,
    Typography,
    Spin,
    Empty
} from 'antd';
import {
    PrinterOutlined,
    CalendarOutlined,
    BankOutlined,
    FileProtectOutlined
} from '@ant-design/icons';
import { reportsAPI } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const GstAuditReport = () => {
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
    const [gstData, setGstData] = useState([]);

    // Summary
    const [totalTaxable, setTotalTaxable] = useState(0);
    const [totalGST, setTotalGST] = useState(0);
    const [totalCGST, setTotalCGST] = useState(0);
    const [totalSGST, setTotalSGST] = useState(0);
    const [totalIGST, setTotalIGST] = useState(0);

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await reportsAPI.getGstAuditReport({
                startDate: dateRange[0].format('YYYY-MM-DD'),
                endDate: dateRange[1].format('YYYY-MM-DD')
            });

            const data = response.data.data || [];

            setGstData(data);

            // Calculate Totals
            const totals = data.reduce((acc, curr) => ({
                taxable: acc.taxable + (curr.taxableValue || 0),
                tax: acc.tax + (curr.totalTax || 0),
                cgst: acc.cgst + (curr.cgst || 0),
                sgst: acc.sgst + (curr.sgst || 0),
                igst: acc.igst + (curr.igst || 0),
            }), { taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0 });

            setTotalTaxable(totals.taxable);
            setTotalGST(totals.tax);
            setTotalCGST(totals.cgst);
            setTotalSGST(totals.sgst);
            setTotalIGST(totals.igst);

        } catch (error) {
            console.error('Error fetching GST report:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Tax Rate',
            dataIndex: 'taxRate',
            key: 'taxRate',
            render: (val) => <Text strong>{val}%</Text>,
            sorter: (a, b) => a.taxRate - b.taxRate,
        },
        {
            title: 'Taxable Value',
            dataIndex: 'taxableValue',
            key: 'taxableValue',
            render: (value) => <Text>₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => a.taxableValue - b.taxableValue,
        },
        {
            title: 'CGST',
            dataIndex: 'cgst',
            key: 'cgst',
            render: (value) => <Text type="secondary">₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
        },
        {
            title: 'SGST',
            dataIndex: 'sgst',
            key: 'sgst',
            render: (value) => <Text type="secondary">₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
        },
        {
            title: 'IGST',
            dataIndex: 'igst',
            key: 'igst',
            render: (value) => <Text type="secondary">₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
        },
        {
            title: 'Total Tax',
            dataIndex: 'totalTax',
            key: 'totalTax',
            render: (value) => <Text strong type="danger">₹{(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>,
            sorter: (a, b) => a.totalTax - b.totalTax,
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={2}><FileProtectOutlined /> GST Audit Report</Title>
                <Text type="secondary">
                    Consolidated report of GST liability by tax rate (GSTR Filing Helper).
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
                    <Col>
                        <Button
                            icon={<PrinterOutlined />}
                            onClick={() => window.print()}
                        >
                            Print
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total Taxable Value"
                            value={totalTaxable}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total CGST + SGST"
                            value={totalCGST + totalSGST}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#fa8c16' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card>
                        <Statistic
                            title="Total IGST"
                            value={totalIGST}
                            prefix="₹"
                            precision={2}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
                        <Statistic
                            title="Total GST to File"
                            value={totalGST}
                            prefix="₹"
                            precision={2}
                            valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
                            prefix={<BankOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card title="GST Breakdown by Rate" style={{ marginTop: 24 }}>
                <Table
                    columns={columns}
                    dataSource={gstData}
                    rowKey="taxRate"
                    pagination={false}
                    loading={loading}
                    summary={(pageData) => {
                        return (
                            <Table.Summary fixed>
                                <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                                    <Table.Summary.Cell>Total</Table.Summary.Cell>
                                    <Table.Summary.Cell>
                                        ₹{totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell>
                                        ₹{totalCGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell>
                                        ₹{totalSGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell>
                                        ₹{totalIGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell>
                                        <Text type="danger">₹{totalGST.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            </Table.Summary>
                        );
                    }}
                />
            </Card>
        </div>
    );
};

export default GstAuditReport;
