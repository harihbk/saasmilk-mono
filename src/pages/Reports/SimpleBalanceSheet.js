import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Select,
  Button,
  Space,
  Typography,
  message,
  Spin,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const SimpleBalanceSheet = () => {
  const [loading, setLoading] = useState(false);
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [data, setData] = useState([]);

  // Get token from localStorage
  const getToken = () => localStorage.getItem('token');

  // API call function
  const apiCall = async (url, params = {}) => {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params
    });
    
    return response.data;
  };

  // Fetch dealers
  const fetchDealers = async () => {
    try {
      console.log('Fetching dealers...');
      const result = await apiCall('/dealers', { limit: 100, status: 'active' });
      console.log('Dealers result:', result);
      
      if (result.success && result.data && result.data.dealers) {
        setDealers(result.data.dealers);
        console.log('Dealers set:', result.data.dealers.length);
      } else {
        console.error('Invalid dealers response:', result);
        message.error('Invalid response format from dealers API');
      }
    } catch (error) {
      console.error('Error fetching dealers:', error);
      message.error('Failed to fetch dealers: ' + error.message);
    }
  };

  // Fetch balance sheet data using the new API
  const fetchBalanceSheet = async () => {
    if (!selectedDealer) return;

    setLoading(true);
    try {
      console.log('Fetching balance sheet for dealer:', selectedDealer);
      
      // Use the dedicated balance sheet API
      const result = await apiCall(`/dealers/${selectedDealer}/balance-sheet`);
      console.log('Balance sheet result:', result);
      
      if (!result.success || !result.data) {
        throw new Error('Failed to fetch balance sheet data');
      }
      
      const { transactions } = result.data;
      
      // Convert to simple format
      const entries = transactions.map(transaction => ({
        key: transaction.id,
        date: new Date(transaction.date).toLocaleDateString(),
        description: transaction.description,
        type: transaction.type.toUpperCase(),
        debit: transaction.debit,
        credit: transaction.credit,
        balance: transaction.balance
      }));
      
      console.log('Final entries:', entries);
      setData(entries);
      
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      message.error('Failed to fetch balance sheet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load dealers on component mount
  useEffect(() => {
    fetchDealers();
  }, []);

  // Fetch balance sheet when dealer selected
  useEffect(() => {
    if (selectedDealer) {
      fetchBalanceSheet();
    } else {
      setData([]);
    }
  }, [selectedDealer]);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 300,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      width: 120,
      align: 'right',
      render: (amount) => amount > 0 ? `₹${amount.toFixed(2)}` : '-',
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      width: 120,
      align: 'right',
      render: (amount) => amount > 0 ? `₹${amount.toFixed(2)}` : '-',
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 150,
      align: 'right',
      render: (balance) => (
        <span style={{ color: balance > 0 ? 'red' : balance < 0 ? 'green' : 'default' }}>
          ₹{Math.abs(balance).toFixed(2)} {balance > 0 ? 'DR' : balance < 0 ? 'CR' : ''}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Simple Balance Sheet</Title>
      
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <span>Select Dealer:</span>
          <Select
            placeholder="Choose a dealer"
            style={{ width: 300 }}
            value={selectedDealer}
            onChange={setSelectedDealer}
            loading={dealers.length === 0}
          >
            {dealers.map(dealer => (
              <Option key={dealer._id} value={dealer._id}>
                {dealer.name} - {dealer.dealerCode}
              </Option>
            ))}
          </Select>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchDealers}
          >
            Refresh Dealers
          </Button>
          {selectedDealer && (
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchBalanceSheet}
              loading={loading}
            >
              Refresh Data
            </Button>
          )}
        </Space>
      </Card>

      <Card title={`Balance Sheet${selectedDealer ? ` - ${dealers.find(d => d._id === selectedDealer)?.name}` : ''}`}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            pagination={false}
            rowKey="key"
            size="small"
          />
        )}
        
        {!selectedDealer && !loading && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
            Please select a dealer to view balance sheet
          </div>
        )}
        
        {data.length === 0 && selectedDealer && !loading && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
            No transactions found for this dealer
          </div>
        )}
      </Card>
      
      {/* Debug Info */}
      {/* <Card title="Debug Info" style={{ marginTop: 24, background: '#f5f5f5' }}>
        <p><strong>Token:</strong> {getToken() ? 'Present' : 'Missing'}</p>
        <p><strong>Dealers Loaded:</strong> {dealers.length}</p>
        <p><strong>Selected Dealer:</strong> {selectedDealer || 'None'}</p>
        <p><strong>Data Entries:</strong> {data.length}</p>
        <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
      </Card> */}
    </div>
  );
};

export default SimpleBalanceSheet;