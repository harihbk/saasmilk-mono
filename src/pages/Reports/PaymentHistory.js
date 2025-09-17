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
  Empty,
  Tabs,
  Progress,
  Timeline,
  Modal,
  Descriptions,
  Radio,
} from 'antd';
import {
  DollarOutlined,
  DownloadOutlined,
  PrinterOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
  TransactionOutlined,
  HistoryOutlined,
  CreditCardOutlined,
  BankOutlined,
  WalletOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { dealersAPI, ordersAPI } from '../../services/api';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const PaymentHistory = () => {
  const [loading, setLoading] = useState(false);
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [credits, setCredits] = useState([]);
  const [debits, setDebits] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(90, 'days').startOf('day'),
    dayjs().endOf('day')
  ]);
  const [transactionType, setTransactionType] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  const [metrics, setMetrics] = useState({
    totalPayments: 0,
    totalCredits: 0,
    totalDebits: 0,
    netBalance: 0,
    averagePaymentAmount: 0,
    largestPayment: 0,
    paymentFrequency: 0,
    outstandingInvoices: 0,
    onTimePaymentRate: 0,
    paymentMethods: {},
    monthlyTrend: [],
  });

  useEffect(() => {
    fetchDealers();
  }, []);

  useEffect(() => {
    if (selectedDealer) {
      console.log('Fetching payment history for dealer:', selectedDealer);
      fetchPaymentHistory();
    } else {
      console.log('No dealer selected, clearing data');
      setTransactions([]);
      setPayments([]);
      setCredits([]);
      setDebits([]);
      setMetrics({
        totalPayments: 0,
        totalCredits: 0,
        totalDebits: 0,
        netBalance: 0,
        averagePaymentAmount: 0,
        largestPayment: 0,
        paymentFrequency: 0,
        outstandingInvoices: 0,
        onTimePaymentRate: 0,
        paymentMethods: {},
        monthlyTrend: [],
      });
    }
  }, [selectedDealer, dateRange, transactionType]);

  const fetchDealers = async () => {
    try {
      console.log('Fetching dealers...');
      const response = await dealersAPI.getDealers({ limit: 1000, status: 'active' });
      console.log('Dealers API response:', response);
      const dealersList = response.data.data.dealers || [];
      console.log('Dealers found:', dealersList.length);
      setDealers(dealersList);
    } catch (error) {
      console.error('Error fetching dealers:', error);
      console.error('Dealers fetch error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      message.error('Failed to fetch dealers');
    }
  };

  const fetchPaymentHistory = async () => {
    if (!selectedDealer) {
      console.log('No dealer selected, skipping fetch');
      return;
    }

    setLoading(true);
    console.log('Starting fetchPaymentHistory for dealer:', selectedDealer);
    console.log('Date range:', dateRange[0].format('YYYY-MM-DD'), 'to', dateRange[1].format('YYYY-MM-DD'));
    
    try {
      // Fetch dealer details
      console.log('Fetching dealer details...');
      const dealerResponse = await dealersAPI.getDealer(selectedDealer);
      console.log('Dealer response:', dealerResponse);
      const dealer = dealerResponse.data.data;
      console.log('Dealer data:', dealer);
      
      // Fetch all orders for payment history
      console.log('Fetching orders...');
      const ordersResponse = await ordersAPI.getOrders({
        dealer: selectedDealer,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        limit: 1000
      });
      console.log('Orders response:', ordersResponse);
      
      const allOrders = ordersResponse.data.data.orders || [];
      console.log('All orders fetched:', allOrders.length);
      
      const dealerOrders = allOrders.filter(order => 
        order.dealer && (order.dealer._id === selectedDealer || order.dealer === selectedDealer)
      );
      console.log('Filtered dealer orders:', dealerOrders.length);
      
      // Process all transactions
      const allTransactions = [];
      const paymentTransactions = [];
      const creditTransactions = [];
      const debitTransactions = [];
      
      // Process dealer transactions
      const dealerTransactions = dealer.transactions || [];
      console.log('Dealer transactions found:', dealerTransactions.length);
      dealerTransactions
        .filter(t => {
          const tDate = dayjs(t.date);
          const isInRange = tDate.isSameOrAfter(dateRange[0]) && tDate.isSameOrBefore(dateRange[1]);
          console.log(`Transaction ${t._id} date ${t.date}: in range = ${isInRange}`);
          return isInRange;
        })
        .forEach(transaction => {
          const transactionData = {
            key: transaction._id,
            date: transaction.date,
            type: transaction.type,
            description: transaction.description,
            amount: transaction.amount,
            reference: transaction.reference,
            balanceAfter: transaction.balanceAfter,
            paymentMethod: transaction.paymentMethod || 'cash',
            status: 'completed',
            source: 'manual'
          };
          
          allTransactions.push(transactionData);
          
          if (transaction.type === 'credit') {
            creditTransactions.push(transactionData);
          } else if (transaction.type === 'debit') {
            debitTransactions.push(transactionData);
          }
        });
      
      // Process order payments
      dealerOrders.forEach(order => {
        // Add invoice as debit
        const invoiceTransaction = {
          key: `invoice_${order._id}`,
          date: order.createdAt,
          type: 'invoice',
          description: `Invoice #${order.orderNumber}`,
          amount: order.pricing?.total || 0,
          reference: order.orderNumber,
          status: order.status,
          paymentMethod: order.payment?.method || 'pending',
          source: 'order',
          orderDetails: order
        };
        
        allTransactions.push(invoiceTransaction);
        debitTransactions.push(invoiceTransaction);
        
        // Add payment if exists
        if (order.payment?.paidAmount > 0) {
          const paymentTransaction = {
            key: `payment_${order._id}`,
            date: order.payment.paymentDate || order.createdAt,
            type: 'payment',
            description: `Payment for Invoice #${order.orderNumber}`,
            amount: order.payment.paidAmount,
            reference: order.orderNumber,
            status: 'completed',
            paymentMethod: order.payment.method || 'cash',
            source: 'order_payment',
            orderDetails: order
          };
          
          allTransactions.push(paymentTransaction);
          paymentTransactions.push(paymentTransaction);
          creditTransactions.push(paymentTransaction);
        }
      });
      
      // Sort by date
      allTransactions.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
      paymentTransactions.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
      creditTransactions.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
      debitTransactions.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));
      
      // Filter by transaction type
      let filteredTransactions = allTransactions;
      if (transactionType === 'payments') {
        filteredTransactions = paymentTransactions;
      } else if (transactionType === 'credits') {
        filteredTransactions = creditTransactions;
      } else if (transactionType === 'debits') {
        filteredTransactions = debitTransactions;
      }
      
      console.log('Final filtered transactions:', filteredTransactions.length);
      console.log('Transaction types breakdown:', {
        all: allTransactions.length,
        payments: paymentTransactions.length, 
        credits: creditTransactions.length,
        debits: debitTransactions.length
      });
      
      setTransactions(filteredTransactions);
      setPayments(paymentTransactions);
      setCredits(creditTransactions);
      setDebits(debitTransactions);
      
      // Calculate metrics
      calculateMetrics(allTransactions, paymentTransactions, creditTransactions, debitTransactions, dealerOrders);
      
    } catch (error) {
      console.error('Error fetching payment history:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      message.error(`Failed to fetch payment history: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (allTrans, payments, credits, debits, orders) => {
    // Calculate totals
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalCredits = credits.reduce((sum, c) => sum + c.amount, 0);
    const totalDebits = debits.reduce((sum, d) => sum + d.amount, 0);
    
    // Payment methods breakdown
    const paymentMethods = {};
    payments.forEach(p => {
      const method = p.paymentMethod || 'cash';
      paymentMethods[method] = (paymentMethods[method] || 0) + p.amount;
    });
    
    // Calculate monthly trend
    const monthlyData = {};
    allTrans.forEach(t => {
      const month = dayjs(t.date).format('YYYY-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { month, credits: 0, debits: 0, payments: 0 };
      }
      
      if (t.type === 'credit' || t.type === 'payment') {
        monthlyData[month].credits += t.amount;
        if (t.type === 'payment') {
          monthlyData[month].payments += t.amount;
        }
      } else {
        monthlyData[month].debits += t.amount;
      }
    });
    
    const monthlyTrend = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        ...m,
        net: m.credits - m.debits,
        monthLabel: dayjs(m.month).format('MMM YY')
      }));
    
    // Calculate payment frequency (payments per month)
    const paymentMonths = new Set(payments.map(p => dayjs(p.date).format('YYYY-MM'))).size;
    const paymentFrequency = paymentMonths > 0 ? payments.length / paymentMonths : 0;
    
    // Calculate on-time payment rate
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
    const onTimePayments = completedOrders.filter(o => {
      if (!o.payment?.paymentDate || !o.deliveryDate) return false;
      const paymentDate = dayjs(o.payment.paymentDate);
      const dueDate = dayjs(o.deliveryDate).add(7, 'days'); // Assuming 7 days payment terms
      return paymentDate.isBefore(dueDate) || paymentDate.isSame(dueDate);
    }).length;
    const onTimePaymentRate = completedOrders.length > 0 
      ? (onTimePayments / completedOrders.length) * 100 
      : 0;
    
    // Outstanding invoices
    const outstandingInvoices = orders.filter(o => 
      o.payment?.dueAmount > 0 && ['pending', 'processing'].includes(o.status)
    ).length;
    
    setMetrics({
      totalPayments,
      totalCredits,
      totalDebits,
      netBalance: totalCredits - totalDebits,
      averagePaymentAmount: payments.length > 0 ? totalPayments / payments.length : 0,
      largestPayment: payments.length > 0 ? Math.max(...payments.map(p => p.amount)) : 0,
      paymentFrequency,
      outstandingInvoices,
      onTimePaymentRate,
      paymentMethods,
      monthlyTrend
    });
  };

  const showTransactionDetails = (record) => {
    setSelectedTransaction(record);
    setDetailModalVisible(true);
  };

  const exportToExcel = () => {
    if (transactions.length === 0) {
      message.warning('No data to export');
      return;
    }

    const exportData = transactions.map(t => ({
      Date: dayjs(t.date).format('YYYY-MM-DD'),
      Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
      Description: t.description,
      Amount: t.amount,
      Reference: t.reference?.id || t.reference || '-',
      'Payment Method': t.paymentMethod || '-',
      Status: t.status || 'completed'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment History');

    const dealer = dealers.find(d => d._id === selectedDealer);
    const filename = `${dealer?.name}_PaymentHistory_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    message.success('Payment history exported successfully');
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'payment':
        return <DollarOutlined style={{ color: '#52c41a' }} />;
      case 'credit':
        return <RiseOutlined style={{ color: '#52c41a' }} />;
      case 'debit':
        return <FallOutlined style={{ color: '#f5222d' }} />;
      case 'invoice':
        return <FileTextOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <TransactionOutlined />;
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => dayjs(date).format('DD MMM YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => (
        <Space>
          {getTransactionIcon(type)}
          <Tag color={type === 'credit' || type === 'payment' ? 'green' : 'red'}>
            {type.toUpperCase()}
          </Tag>
        </Space>
      ),
      filters: [
        { text: 'Payment', value: 'payment' },
        { text: 'Credit', value: 'credit' },
        { text: 'Debit', value: 'debit' },
        { text: 'Invoice', value: 'invoice' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 300,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (amount, record) => (
        <Text strong style={{ color: record.type === 'credit' || record.type === 'payment' ? '#52c41a' : '#f5222d' }}>
          {record.type === 'credit' || record.type === 'payment' ? '+' : '-'}₹{amount.toLocaleString()}
        </Text>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method) => {
        const methodConfig = {
          cash: { icon: <DollarOutlined />, color: 'green' },
          card: { icon: <CreditCardOutlined />, color: 'blue' },
          'bank-transfer': { icon: <BankOutlined />, color: 'purple' },
          'digital-wallet': { icon: <WalletOutlined />, color: 'cyan' },
          credit: { icon: <CreditCardOutlined />, color: 'orange' },
          cheque: { icon: <FileTextOutlined />, color: 'magenta' },
        };
        const config = methodConfig[method] || { icon: <DollarOutlined />, color: 'default' };
        return (
          <Tag icon={config.icon} color={config.color}>
            {method?.toUpperCase() || 'CASH'}
          </Tag>
        );
      },
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      width: 150,
      render: (reference, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => showTransactionDetails(record)}
        >
          {reference?.id || reference || 'View Details'}
        </Button>
      ),
    },
  ];

  const selectedDealerInfo = dealers.find(d => d._id === selectedDealer);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Payment History & Transaction Analytics</Title>
        <Text type="secondary">
          Comprehensive view of all payments, credits, debits, and transaction metrics
        </Text>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Select Dealer
            </Text>
            <Select
              placeholder="Choose a dealer..."
              style={{ width: '100%' }}
              onChange={(value) => {
                console.log('Dealer selected:', value);
                setSelectedDealer(value);
              }}
              value={selectedDealer}
              showSearch
              optionFilterProp="children"
              loading={dealers.length === 0}
              notFoundContent={dealers.length === 0 ? 'Loading dealers...' : 'No dealers found'}
            >
              {dealers.map(dealer => (
                <Option key={dealer._id} value={dealer._id}>
                  {dealer.name} - {dealer.dealerCode}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Transaction Type
            </Text>
            <Radio.Group
              value={transactionType}
              onChange={e => setTransactionType(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="all">All</Radio.Button>
              <Radio.Button value="payments">Payments</Radio.Button>
              <Radio.Button value="credits">Credits</Radio.Button>
              <Radio.Button value="debits">Debits</Radio.Button>
            </Radio.Group>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Date Range
            </Text>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              format="DD MMM YYYY"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              &nbsp;
            </Text>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={exportToExcel}
                disabled={!selectedDealer || transactions.length === 0}
              >
                Export
              </Button>
              <Button
                icon={<PrinterOutlined />}
                onClick={() => window.print()}
                disabled={!selectedDealer || transactions.length === 0}
              >
                Print
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Metrics Summary */}
      {selectedDealer && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="Total Payments"
                  value={metrics.totalPayments}
                  prefix="₹"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="Total Credits"
                  value={metrics.totalCredits}
                  prefix="₹"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="Total Debits"
                  value={metrics.totalDebits}
                  prefix="₹"
                  valueStyle={{ color: '#f5222d' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="Net Balance"
                  value={Math.abs(metrics.netBalance)}
                  prefix="₹"
                  suffix={metrics.netBalance > 0 ? 'DR' : metrics.netBalance < 0 ? 'CR' : ''}
                  valueStyle={{ color: metrics.netBalance > 0 ? '#f5222d' : metrics.netBalance < 0 ? '#52c41a' : '#595959' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="Avg Payment"
                  value={metrics.averagePaymentAmount}
                  prefix="₹"
                  precision={2}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="Payment Frequency"
                  value={metrics.paymentFrequency}
                  suffix="/month"
                  precision={1}
                />
              </Card>
            </Col>
          </Row>

          {/* Additional Metrics */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={8}>
              <Card title="Payment Methods">
                {Object.entries(metrics.paymentMethods).map(([method, amount]) => (
                  <div key={method} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>{method.toUpperCase()}</Text>
                      <Text strong>₹{amount.toLocaleString()}</Text>
                    </div>
                    <Progress
                      percent={(amount / metrics.totalPayments) * 100}
                      showInfo={false}
                      strokeColor="#1890ff"
                    />
                  </div>
                ))}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card title="Payment Performance">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="On-Time Rate"
                      value={metrics.onTimePaymentRate}
                      suffix="%"
                      precision={1}
                      valueStyle={{ color: metrics.onTimePaymentRate > 80 ? '#52c41a' : '#faad14' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Outstanding"
                      value={metrics.outstandingInvoices}
                      suffix="invoices"
                      valueStyle={{ color: '#fa541c' }}
                    />
                  </Col>
                </Row>
                <Divider />
                <Statistic
                  title="Largest Payment"
                  value={metrics.largestPayment}
                  prefix="₹"
                />
              </Card>
            </Col>
            <Col xs={24} sm={24} lg={8}>
              <Card title="Recent Activity">
                <Timeline>
                  {transactions.slice(0, 5).map((t, index) => (
                    <Timeline.Item
                      key={t.key}
                      color={t.type === 'credit' || t.type === 'payment' ? 'green' : 'red'}
                      dot={getTransactionIcon(t.type)}
                    >
                      <Text style={{ fontSize: '12px' }}>
                        {dayjs(t.date).format('DD MMM')} - {t.description}
                      </Text>
                      <br />
                      <Text strong style={{ fontSize: '13px' }}>
                        ₹{t.amount.toLocaleString()}
                      </Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Transactions Table */}
      <Card 
        title={
          <Space>
            <HistoryOutlined />
            Transaction History
            {selectedDealer && transactions.length > 0 && (
              <Tag color="blue">{transactions.length} transactions</Tag>
            )}
          </Space>
        }
      >
        {!selectedDealer ? (
          <Empty
            description="Please select a dealer to view payment history"
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
          />
        )}
      </Card>

      {/* Transaction Detail Modal */}
      <Modal
        title="Transaction Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedTransaction && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Date" span={2}>
              {dayjs(selectedTransaction.date).format('DD MMM YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color={selectedTransaction.type === 'credit' || selectedTransaction.type === 'payment' ? 'green' : 'red'}>
                {selectedTransaction.type.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              <Text strong style={{ fontSize: '16px' }}>
                ₹{selectedTransaction.amount.toLocaleString()}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {selectedTransaction.description}
            </Descriptions.Item>
            <Descriptions.Item label="Reference">
              {selectedTransaction.reference?.id || selectedTransaction.reference || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Payment Method">
              {selectedTransaction.paymentMethod?.toUpperCase() || 'CASH'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedTransaction.status === 'completed' ? 'green' : 'orange'}>
                {selectedTransaction.status?.toUpperCase() || 'COMPLETED'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Source">
              {selectedTransaction.source?.replace('_', ' ').toUpperCase() || 'MANUAL'}
            </Descriptions.Item>
            {selectedTransaction.orderDetails && (
              <>
                <Descriptions.Item label="Order Number" span={2}>
                  {selectedTransaction.orderDetails.orderNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Order Total">
                  ₹{(selectedTransaction.orderDetails.pricing?.total || 0).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Due Amount">
                  ₹{(selectedTransaction.orderDetails.payment?.dueAmount || 0).toLocaleString()}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default PaymentHistory;