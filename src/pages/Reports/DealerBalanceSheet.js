import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Space,
  Typography,
  Tag,
  Statistic,
  message,
  Empty,
  Descriptions,
  Modal,
  Divider,
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { dealersAPI } from '../../services/api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const DealerBalanceSheet = () => {
  const [loading, setLoading] = useState(false);
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days').startOf('day'),
    dayjs().endOf('day')
  ]);
  const [summary, setSummary] = useState({
    openingBalance: 0,
    totalDebits: 0,
    totalCredits: 0,
    closingBalance: 0,
    totalInvoices: 0,
    pendingAmount: 0,
  });
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Fetch dealers on mount
  useEffect(() => {
    fetchDealers();
  }, []);

  // Fetch balance sheet when dealer or date range changes
  useEffect(() => {
    if (selectedDealer) fetchTransactions();
  }, [selectedDealer, dateRange]);

  const fetchDealers = async () => {
    try {
      const res = await dealersAPI.getDealers({ limit: 1000, status: 'active' });
      setDealers(res.data.data.dealers || []);
    } catch (error) {
      console.error('Dealer fetch error:', error);
      message.error('Failed to load dealers');
    }
  };

  const fetchTransactions = async () => {
    if (!selectedDealer) return;
    setLoading(true);
    try {
      const res = await dealersAPI.getDealerBalanceSheet(selectedDealer, {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      });
      const { transactions: apiTransactions, summary: apiSummary } = res.data.data;

      // Avoid duplicate invoices using Map
      const uniqueTx = [];
      const seenRefs = new Set();
      for (const tx of apiTransactions) {
        if (tx.type === 'invoice') {
          if (seenRefs.has(tx.reference)) continue;
          seenRefs.add(tx.reference);
        }
        uniqueTx.push({
          key: tx.id,
          date: dayjs(tx.date).format('YYYY-MM-DD'),
          type: tx.type,
          description: tx.description,
          reference: tx.reference,
          referenceType: tx.referenceType,
          debit: tx.debit,
          credit: tx.credit,
          balance: tx.balance,
          status: tx.status,
          invoiceAmount: tx.invoiceAmount || tx.debit || 0,
          invoiceDetails: tx.invoiceDetails || null,
        });
      }

      setTransactions(uniqueTx);
      setSummary(apiSummary);
    } catch (err) {
      console.error('Balance sheet fetch error:', err);
      message.error('Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  };

  const showInvoiceDetails = (record) => {
    if (record.invoiceDetails) {
      setSelectedInvoice(record.invoiceDetails);
      setInvoiceModalVisible(true);
    }
  };

  const exportToExcel = () => {
    if (transactions.length === 0) return message.warning('No data to export');
    const exportData = transactions.map(t => ({
      Date: t.date,
      Type: t.type.toUpperCase(),
      Description: t.description,
      Reference: t.reference,
      'Invoice Amount (₹)': t.invoiceAmount || '',
      Debit: t.debit || '',
      Credit: t.credit || '',
      Balance: t.balance,
      Status: t.status
    }));
    exportData.push({}, {
      Date: 'SUMMARY',
      Description: 'Total',
      'Invoice Amount (₹)': '',
      Debit: summary.totalDebits,
      Credit: summary.totalCredits,
      Balance: summary.closingBalance
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
    const dealer = dealers.find(d => d._id === selectedDealer);
    const filename = `${dealer?.name || 'Dealer'}_BalanceSheet_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    XLSX.writeFile(wb, filename);
    message.success('Balance sheet exported');
  };

  const handlePrint = () => window.print();

  const getBalanceColor = (balance) => {
    if (balance > 0) return '#f5222d';
    if (balance < 0) return '#52c41a';
    return '#595959';
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 120,
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 100,
      render: (type) => {
        const map = {
          opening: 'blue',
          invoice: 'orange',
          payment: 'green',
          debit: 'red',
          credit: 'green',
        };
        return <Tag color={map[type] || 'default'}>{type.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: 300,
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      width: 150,
      render: (ref, record) =>
        record.type === 'invoice' && record.invoiceDetails ? (
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => showInvoiceDetails(record)}
          >
            {ref}
          </Button>
        ) : ref,
    },
    {
      title: 'Invoice Amount (₹)',
      dataIndex: 'invoiceAmount',
      align: 'right',
      width: 150,
      render: (val) =>
        val > 0 ? `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Debit (₹)',
      dataIndex: 'debit',
      align: 'right',
      width: 120,
      render: (val) =>
        val > 0 ? `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Credit (₹)',
      dataIndex: 'credit',
      align: 'right',
      width: 120,
      render: (val) =>
        val > 0 ? `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Balance (₹)',
      dataIndex: 'balance',
      align: 'right',
      fixed: 'right',
      width: 150,
      render: (bal) => (
        <Tag
          color={bal > 0 ? 'red' : bal < 0 ? 'green' : 'default'}
          style={{ fontSize: '14px' }}
        >
          ₹{Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          {bal > 0 ? ' DR' : bal < 0 ? ' CR' : ''}
        </Tag>
      ),
    },
  ];

  const selectedDealerInfo = dealers.find(d => d._id === selectedDealer);

  return (
    <div style={{ padding: 24 }}>
      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Text strong>Select Dealer</Text>
            <Select
              placeholder="Select dealer..."
              style={{ width: '100%', marginTop: 8 }}
              onChange={setSelectedDealer}
              value={selectedDealer}
              showSearch
              optionFilterProp="children"
            >
              {dealers.map(d => (
                <Option key={d._id} value={d._id}>
                  {d.name} - {d.dealerCode}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong>Date Range</Text>
            <RangePicker
              style={{ width: '100%', marginTop: 8 }}
              value={dateRange}
              onChange={setDateRange}
              format="DD MMM YYYY"
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space style={{ marginTop: 30 }}>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchTransactions}
                loading={loading}
                disabled={!selectedDealer}
              >
                Refresh
              </Button>
              <Button icon={<DownloadOutlined />} onClick={exportToExcel}>
                Export
              </Button>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                Print
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Summary */}
      {selectedDealer && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="Opening Balance"
                value={Math.abs(summary.openingBalance)}
                prefix="₹"
                suffix={summary.openingBalance > 0 ? 'DR' : summary.openingBalance < 0 ? 'CR' : ''}
                valueStyle={{ color: getBalanceColor(summary.openingBalance) }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card><Statistic title="Total Debits" value={summary.totalDebits} prefix="₹" /></Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card><Statistic title="Total Credits" value={summary.totalCredits} prefix="₹" /></Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="Closing Balance"
                value={Math.abs(summary.closingBalance)}
                prefix="₹"
                suffix={summary.closingBalance > 0 ? 'DR' : summary.closingBalance < 0 ? 'CR' : ''}
                valueStyle={{ color: getBalanceColor(summary.closingBalance) }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card><Statistic title="Total Invoices" value={summary.totalInvoices} prefix={<FileTextOutlined />} /></Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card><Statistic title="Pending Amount" value={summary.pendingAmount} prefix="₹" valueStyle={{ color: '#faad14' }} /></Card>
          </Col>
        </Row>
      )}

      {/* Transactions Table */}
      <Card title={<><FileTextOutlined /> Transaction Details</>}>
        {!selectedDealer ? (
          <Empty description="Please select a dealer" />
        ) : (
          <Table
            columns={columns}
            dataSource={transactions}
            loading={loading}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1300 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <strong>Total</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong>₹{summary.totalDebits.toLocaleString()}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong>₹{summary.totalCredits.toLocaleString()}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Tag color={summary.closingBalance > 0 ? 'red' : 'green'}>
                    ₹{Math.abs(summary.closingBalance).toLocaleString()}
                    {summary.closingBalance > 0 ? ' DR' : ' CR'}
                  </Tag>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        )}
      </Card>

      {/* Invoice Modal */}
      <Modal
        open={invoiceModalVisible}
        title={`Invoice Details - ${selectedInvoice?.orderNumber}`}
        onCancel={() => setInvoiceModalVisible(false)}
        footer={<Button onClick={() => setInvoiceModalVisible(false)}>Close</Button>}
        width={800}
      >
        {selectedInvoice && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Order No.">{selectedInvoice.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Date">{dayjs(selectedInvoice.createdAt).format('DD MMM YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedInvoice.status === 'completed' ? 'green' : 'orange'}>
                  {selectedInvoice.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag color={selectedInvoice.payment?.status === 'completed' ? 'green' : 'red'}>
                  {(selectedInvoice.payment?.status || 'unpaid').toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Table
              dataSource={selectedInvoice.items}
              pagination={false}
              size="small"
              rowKey="_id"
              columns={[
                { title: 'Product', dataIndex: ['product', 'name'], key: 'product' },
                { title: 'Qty', dataIndex: 'quantity', align: 'center', width: 80 },
                { title: 'Unit Price', dataIndex: 'unitPrice', align: 'right', render: v => `₹${v.toFixed(2)}` },
                { title: 'Total', dataIndex: 'totalPrice', align: 'right', render: v => `₹${v.toFixed(2)}` },
              ]}
            />

            <Divider />

            <Descriptions column={1} bordered>
              <Descriptions.Item label="Subtotal">₹{selectedInvoice.pricing?.subtotal.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Tax">₹{selectedInvoice.pricing?.tax.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Total"><strong>₹{selectedInvoice.pricing?.total.toFixed(2)}</strong></Descriptions.Item>
              <Descriptions.Item label="Paid Amount">₹{selectedInvoice.payment?.paidAmount.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Due Amount">
                <Tag color="red">₹{selectedInvoice.payment?.dueAmount.toFixed(2)}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </div>
  );
};

export default DealerBalanceSheet;
