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
  Divider,
  message,
  Spin,
  Empty,
  Tooltip,
  Descriptions,
  Modal,
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  CalendarOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  FilterOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { dealersAPI, ordersAPI } from '../../services/api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const DealerBalanceSheet = () => {
  console.log('=== DealerBalanceSheet COMPONENT LOADED ===');
  
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

  useEffect(() => {
    console.log('=== DealerBalanceSheet useEffect fetchDealers RUNNING ===');
    fetchDealers();
  }, []);

  useEffect(() => {
    if (selectedDealer) {
      fetchTransactions();
    }
  }, [selectedDealer, dateRange]);

  const fetchDealers = async () => {
    try {
      console.log('=== FETCH DEALERS START ===');
      console.log('Local storage token:', localStorage.getItem('token'));
      console.log('API base URL:', 'http://localhost:8000/api');
      
      const response = await dealersAPI.getDealers({ limit: 1000, status: 'active' });
      console.log('=== DEALERS API RESPONSE ===');
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      
      const dealersList = response.data.data.dealers || [];
      console.log('Dealers extracted:', dealersList.length);
      console.log('First dealer:', dealersList[0]);
      
      setDealers(dealersList);
      console.log('=== DEALERS SET IN STATE ===');
    } catch (error) {
      console.error('=== DEALERS API ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      console.error('Request config:', error.config);
      message.error('Failed to fetch dealers: ' + error.message);
    }
  };

  const fetchTransactions = async () => {
    if (!selectedDealer) {
      console.log('No dealer selected for fetchTransactions');
      return;
    }
    
    setLoading(true);
    console.log('=== STARTING FETCH BALANCE SHEET ===');
    console.log('Selected dealer ID:', selectedDealer);
    console.log('Date range:', dateRange[0].format('YYYY-MM-DD'), 'to', dateRange[1].format('YYYY-MM-DD'));
    
    try {
      // Use the new dedicated balance sheet API
      const response = await dealersAPI.getDealerBalanceSheet(selectedDealer, {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      });
      
      console.log('Balance sheet API response:', response);
      
      const { dealer, transactions: apiTransactions, summary: apiSummary } = response.data.data;
      
      // Convert API transactions to frontend format
      const processedTransactions = apiTransactions.map(transaction => ({
        key: transaction.id,
        date: dayjs(transaction.date).format('YYYY-MM-DD'),
        type: transaction.type,
        description: transaction.description,
        reference: transaction.reference,
        referenceType: transaction.referenceType,
        debit: transaction.debit,
        credit: transaction.credit,
        balance: transaction.balance,
        status: transaction.status,
        invoiceDetails: transaction.invoiceDetails
      }));
      
      console.log('=== FINAL RESULTS ===');
      console.log('Processed transactions:', processedTransactions.length);
      console.log('Summary:', apiSummary);
      
      setTransactions(processedTransactions);
      setSummary(apiSummary);
      
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      message.error('Failed to fetch balance sheet: ' + error.message);
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
    if (transactions.length === 0) {
      message.warning('No data to export');
      return;
    }

    // Prepare data for export
    const exportData = transactions.map(t => ({
      Date: t.date,
      Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
      Description: t.description,
      Reference: t.reference,
      Debit: t.debit || '',
      Credit: t.credit || '',
      Balance: t.balance,
      Status: t.status
    }));

    // Add summary row
    exportData.push({});
    exportData.push({
      Date: 'SUMMARY',
      Type: '',
      Description: 'Total',
      Reference: '',
      Debit: summary.totalDebits,
      Credit: summary.totalCredits,
      Balance: summary.closingBalance,
      Status: ''
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');

    // Generate filename
    const dealer = dealers.find(d => d._id === selectedDealer);
    const filename = `${dealer?.name}_BalanceSheet_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, filename);
    message.success('Balance sheet exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return '#f5222d'; // Red for debit (dealer owes us)
    if (balance < 0) return '#52c41a'; // Green for credit (dealer has credit with us)
    return '#595959'; // Gray for zero
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type, record) => {
        const typeConfig = {
          opening: { color: 'blue', text: 'Opening' },
          invoice: { color: 'orange', text: 'Invoice' },
          payment: { color: 'green', text: 'Payment' },
          debit: { color: 'red', text: 'Debit' },
          credit: { color: 'green', text: 'Credit' },
        };
        
        // Special handling for balance adjustments
        if (record.key === 'balance_adjustment') {
          const adjustmentConfig = type === 'credit' 
            ? { color: 'cyan', text: 'Manual Credit' }
            : { color: 'volcano', text: 'Manual Debit' };
          return <Tag color={adjustmentConfig.color}>{adjustmentConfig.text}</Tag>;
        }
        const config = typeConfig[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 300,
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      width: 150,
      render: (reference, record) => {
        if (record.type === 'invoice' && record.invoiceDetails) {
          return (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => showInvoiceDetails(record)}
            >
              {reference}
            </Button>
          );
        }
        return reference;
      },
    },
    {
      title: 'Debit (₹)',
      dataIndex: 'debit',
      key: 'debit',
      width: 120,
      align: 'right',
      render: (debit) => debit > 0 ? `₹${debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Credit (₹)',
      dataIndex: 'credit',
      key: 'credit',
      width: 120,
      align: 'right',
      render: (credit) => credit > 0 ? `₹${credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
    },
    {
      title: 'Balance (₹)',
      dataIndex: 'balance',
      key: 'balance',
      width: 150,
      align: 'right',
      fixed: 'right',
      render: (balance) => (
        <Tag color={balance > 0 ? 'red' : balance < 0 ? 'green' : 'default'} style={{ fontSize: '14px' }}>
          ₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {balance > 0 ? 'DR' : balance < 0 ? 'CR' : ''}
        </Tag>
      ),
    },
  ];

  const selectedDealerInfo = dealers.find(d => d._id === selectedDealer);

  console.log('=== DealerBalanceSheet RENDER ===');
  console.log('Dealers count:', dealers.length);
  console.log('Selected dealer:', selectedDealer);
  console.log('Transactions count:', transactions.length);
  console.log('Loading state:', loading);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Dealer Balance Sheet - DEBUG MODE</Title>
        <Text type="secondary">
          View detailed transaction history and balance sheet for dealers
        </Text>
        <div style={{ marginTop: 16, background: '#f0f0f0', padding: 16 }}>
          <p><strong>Debug Info:</strong></p>
          <p>Dealers loaded: {dealers.length}</p>
          <p>Selected dealer: {selectedDealer || 'None'}</p>
          <p>Transactions: {transactions.length}</p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Select Dealer
            </Text>
            <Select
              placeholder="Choose a dealer..."
              style={{ width: '100%' }}
              onChange={setSelectedDealer}
              value={selectedDealer}
              showSearch
              optionFilterProp="children"
            >
              {dealers.map(dealer => (
                <Option key={dealer._id} value={dealer._id}>
                  {dealer.name} - {dealer.dealerCode}
                  {dealer.financialInfo?.currentBalance !== undefined && (
                    <Tag
                      color={dealer.financialInfo.currentBalance > 0 ? 'red' : dealer.financialInfo.currentBalance < 0 ? 'green' : 'default'}
                      style={{ marginLeft: 8 }}
                    >
                      ₹{Math.abs(dealer.financialInfo.currentBalance).toLocaleString()}
                      {dealer.financialInfo.currentBalance > 0 ? ' DR' : dealer.financialInfo.currentBalance < 0 ? ' CR' : ''}
                    </Tag>
                  )}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Date Range
            </Text>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              format="DD MMM YYYY"
              allowClear={false}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              &nbsp;
            </Text>
            <Space>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={fetchTransactions}
                loading={loading}
                disabled={!selectedDealer}
              >
                Refresh
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={exportToExcel}
                disabled={!selectedDealer || transactions.length === 0}
              >
                Export
              </Button>
              <Button
                icon={<PrinterOutlined />}
                onClick={handlePrint}
                disabled={!selectedDealer || transactions.length === 0}
              >
                Print
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Dealer Info */}
      {selectedDealerInfo && (
        <Card style={{ marginBottom: 24 }}>
          <Descriptions title="Dealer Information" column={{ xs: 1, sm: 2, md: 4 }}>
            <Descriptions.Item label="Name">{selectedDealerInfo.name}</Descriptions.Item>
            <Descriptions.Item label="Code">{selectedDealerInfo.dealerCode}</Descriptions.Item>
            <Descriptions.Item label="Group">{selectedDealerInfo.dealerGroup?.name}</Descriptions.Item>
            <Descriptions.Item label="Contact">{selectedDealerInfo.contactInfo?.primaryPhone}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedDealerInfo.contactInfo?.email}</Descriptions.Item>
            <Descriptions.Item label="Credit Limit">
              ₹{(selectedDealerInfo.financialInfo?.creditLimit || 0).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Credit Days">{selectedDealerInfo.financialInfo?.creditDays || 0} days</Descriptions.Item>
            <Descriptions.Item label="GST">{selectedDealerInfo.financialInfo?.gstNumber || 'N/A'}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Summary Statistics */}
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
            <Card>
              <Statistic
                title="Total Debits"
                value={summary.totalDebits}
                prefix="₹"
                precision={2}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="Total Credits"
                value={summary.totalCredits}
                prefix="₹"
                precision={2}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
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
            <Card>
              <Statistic
                title="Total Invoices"
                value={summary.totalInvoices}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card>
              <Statistic
                title="Pending Amount"
                value={summary.pendingAmount}
                prefix="₹"
                precision={2}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Transactions Table */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            Transaction Details
            {selectedDealer && transactions.length > 0 && (
              <Tag color="blue">{transactions.length} records</Tag>
            )}
          </Space>
        }
        className="printable-area"
      >
        {!selectedDealer ? (
          <Empty
            description="Please select a dealer to view balance sheet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={transactions}
            loading={loading}
            rowKey="key"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} transactions`,
            }}
            scroll={{ x: 1200 }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <strong>Total</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <strong>₹{summary.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <strong>₹{summary.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <Tag
                      color={summary.closingBalance > 0 ? 'red' : summary.closingBalance < 0 ? 'green' : 'default'}
                      style={{ fontSize: '14px', fontWeight: 'bold' }}
                    >
                      ₹{Math.abs(summary.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {summary.closingBalance > 0 ? ' DR' : summary.closingBalance < 0 ? ' CR' : ''}
                    </Tag>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
        )}
      </Card>

      {/* Invoice Details Modal */}
      <Modal
        title={`Invoice Details - ${selectedInvoice?.orderNumber}`}
        open={invoiceModalVisible}
        onCancel={() => setInvoiceModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setInvoiceModalVisible(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {selectedInvoice && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Order Number">{selectedInvoice.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Date">
                {dayjs(selectedInvoice.createdAt).format('DD MMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedInvoice.status === 'completed' ? 'green' : 'orange'}>
                  {selectedInvoice.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag color={selectedInvoice.payment?.status === 'paid' ? 'green' : 'red'}>
                  {(selectedInvoice.payment?.status || 'unpaid').toUpperCase()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Items</Title>
            <Table
              dataSource={selectedInvoice.items}
              rowKey="_id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Product',
                  dataIndex: 'productName',
                  key: 'productName',
                },
                {
                  title: 'Quantity',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  width: 80,
                  align: 'center',
                },
                {
                  title: 'Unit Price',
                  dataIndex: 'unitPrice',
                  key: 'unitPrice',
                  width: 100,
                  align: 'right',
                  render: (price) => `₹${price.toFixed(2)}`,
                },
                {
                  title: 'Total',
                  dataIndex: 'totalPrice',
                  key: 'totalPrice',
                  width: 120,
                  align: 'right',
                  render: (total) => `₹${total.toFixed(2)}`,
                },
              ]}
            />

            <Divider />

            <Row justify="end">
              <Col span={10}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Subtotal">
                    ₹{(selectedInvoice.pricing?.subtotal || 0).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Discount">
                    -₹{(selectedInvoice.pricing?.discount || 0).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tax">
                    ₹{(selectedInvoice.pricing?.tax || 0).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<strong>Total</strong>}>
                    <strong>₹{(selectedInvoice.pricing?.total || 0).toFixed(2)}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Paid Amount">
                    ₹{(selectedInvoice.payment?.paidAmount || 0).toFixed(2)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<strong>Due Amount</strong>}>
                    <Tag color="red">
                      ₹{(selectedInvoice.payment?.dueAmount || 0).toFixed(2)}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      <style jsx>{`
        @media print {
          .ant-layout-header,
          .ant-layout-sider,
          .ant-card:not(.printable-area),
          .ant-btn,
          .ant-select,
          .ant-picker {
            display: none !important;
          }
          
          .printable-area {
            box-shadow: none !important;
            border: 1px solid #d9d9d9 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DealerBalanceSheet;