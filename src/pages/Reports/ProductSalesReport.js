import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    DatePicker,
    Button,
    Space,
    Typography,
    Select,
    Row,
    Col,
    Statistic,
    message
} from 'antd';
import {
    DownloadOutlined,
    SearchOutlined,
    FilterOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { reportsAPI, categoriesAPI, subCategoriesAPI, productsAPI } from '../../services/api';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

const ProductSalesReport = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [dates, setDates] = useState([
        dayjs().startOf('month'),
        dayjs().endOf('month')
    ]);

    // Filters
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [products, setProducts] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [dates, selectedCategory, selectedSubCategory, selectedProduct]);

    const fetchFilters = async () => {
        try {
            const [catRes, subCatRes, prodRes] = await Promise.all([
                categoriesAPI.getCategories({ limit: 100 }),
                subCategoriesAPI.getSubCategories({ limit: 100 }),
                productsAPI.getProducts({ limit: 1000 }) // Need many products
            ]);

            setCategories(catRes.data?.data?.categories || []);
            setSubCategories(subCatRes.data?.data?.subcategories || []);
            setProducts(prodRes.data?.data?.products || []);
        } catch (error) {
            console.error("Error fetching filters", error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = {
                startDate: dates[0].format('YYYY-MM-DD'),
                endDate: dates[1].format('YYYY-MM-DD'),
                categoryId: selectedCategory,
                subCategoryId: selectedSubCategory,
                productId: selectedProduct
            };

            const response = await reportsAPI.getProductSalesReport(params);
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            message.error('Failed to fetch product sales report');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const exportData = data.map(item => ({
            'Product Name': item.productName,
            'SKU': item.sku,
            'Category': item.categoryName,
            'Sub Category': item.subCategoryName,
            'Packaging': item.packaging ? `${item.packaging.size.value} ${item.packaging.size.unit}` : '-',
            'Quantity Sold': item.totalQuantitySold,
            'Total Volume (Liters)': item.totalLiters,
            'Total Weight (Kg)': item.totalKg,
            'Total Revenue': item.totalRevenue,
            'Avg Price': item.averageSellingPrice
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Product Sales');
        XLSX.writeFile(wb, `product_sales_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    };

    const columns = [
        {
            title: 'Product',
            dataIndex: 'productName',
            key: 'productName',
            fixed: 'left',
            sorter: (a, b) => a.productName.localeCompare(b.productName),
        },
        {
            title: 'Packaging',
            key: 'packaging',
            render: (_, r) => r.packaging ? <Tag>{r.packaging.size.value} {r.packaging.size.unit}</Tag> : '-'
        },
        {
            title: 'Category',
            dataIndex: 'categoryName',
            key: 'categoryName',
            filters: categories.map(c => ({ text: c.name, value: c.name })),
            onFilter: (value, record) => record.categoryName === value,
        },
        {
            title: 'Sub Category',
            dataIndex: 'subCategoryName',
            key: 'subCategoryName',
        },
        {
            title: 'Qty Sold',
            dataIndex: 'totalQuantitySold',
            key: 'quantity',
            sorter: (a, b) => a.totalQuantitySold - b.totalQuantitySold,
            align: 'right',
            render: (val) => <Text strong>{val}</Text>
        },
        {
            title: 'Total Volume',
            dataIndex: 'totalLiters',
            key: 'liters',
            render: (val) => val > 0 ? `${val} L` : '-',
            sorter: (a, b) => a.totalLiters - b.totalLiters,
            align: 'right',
        },
        {
            title: 'Total Weight',
            dataIndex: 'totalKg',
            key: 'kg',
            render: (val) => val > 0 ? `${val} Kg` : '-',
            sorter: (a, b) => a.totalKg - b.totalKg,
            align: 'right',
        },
        {
            title: 'Revenue',
            dataIndex: 'totalRevenue',
            key: 'revenue',
            render: val => `₹${val.toLocaleString()}`,
            sorter: (a, b) => a.totalRevenue - b.totalRevenue,
            align: 'right',
        }
    ];

    // Tag helper
    const Tag = ({ children }) => (
        <span style={{ padding: '2px 6px', background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '12px' }}>
            {children}
        </span>
    );

    return (
        <div className="report-container">
            <Card>
                <div style={{ marginBottom: 24 }}>
                    <Row justify="space-between" align="middle" gutter={[16, 16]}>
                        <Col>
                            <Title level={4} style={{ margin: 0 }}>Product Sales Analysis (Volume/Weight)</Title>
                            <Text type="secondary">Detailed breakdown of products sold with unit conversions</Text>
                        </Col>
                        <Col>
                            <Space>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={fetchReport}
                                    loading={loading}
                                >
                                    Refresh
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    onClick={handleExport}
                                    disabled={data.length === 0}
                                >
                                    Export Excel
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                </div>

                <div style={{ marginBottom: 24, padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                    <Row gutter={[16, 16]}>
                        <Col span={6}>
                            <Text strong>Date Range</Text>
                            <RangePicker
                                style={{ width: '100%', marginTop: 8 }}
                                value={dates}
                                onChange={setDates}
                                allowClear={false}
                            />
                        </Col>
                        <Col span={6}>
                            <Text strong>Category</Text>
                            <Select
                                style={{ width: '100%', marginTop: 8 }}
                                allowClear
                                placeholder="All Categories"
                                value={selectedCategory}
                                onChange={setSelectedCategory}
                            >
                                {categories.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
                            </Select>
                        </Col>
                        <Col span={6}>
                            <Text strong>Sub Category</Text>
                            <Select
                                style={{ width: '100%', marginTop: 8 }}
                                allowClear
                                placeholder="All Sub Categories"
                                value={selectedSubCategory}
                                onChange={setSelectedSubCategory}
                            >
                                {subCategories
                                    .filter(s => !selectedCategory || s.category?._id === selectedCategory || s.category === selectedCategory)
                                    .map(s => <Option key={s._id} value={s._id}>{s.subcategory}</Option>)}
                            </Select>
                        </Col>
                        <Col span={6}>
                            <Text strong>Product</Text>
                            <Select
                                style={{ width: '100%', marginTop: 8 }}
                                allowClear
                                placeholder="All Products"
                                showSearch
                                optionFilterProp="children"
                                value={selectedProduct}
                                onChange={setSelectedProduct}
                            >
                                {products
                                    .filter(p => (!selectedCategory || p.category?._id === selectedCategory || p.category === selectedCategory) &&
                                        (!selectedSubCategory || p.subcategory?._id === selectedSubCategory || p.subcategory === selectedSubCategory))
                                    .map(p => <Option key={p._id} value={p._id}>{p.name}</Option>)}
                            </Select>
                        </Col>
                    </Row>
                </div>

                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Statistic
                            title="Total Quantity Sold"
                            value={data.reduce((acc, curr) => acc + curr.totalQuantitySold, 0)}
                            suffix="units"
                        />
                    </Col>
                    <Col span={6}>
                        <Statistic
                            title="Total Volume Sold"
                            value={data.reduce((acc, curr) => acc + curr.totalLiters, 0)}
                            precision={2}
                            suffix="L"
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Col>
                    <Col span={6}>
                        <Statistic
                            title="Total Weight Sold"
                            value={data.reduce((acc, curr) => acc + curr.totalKg, 0)}
                            precision={2}
                            suffix="Kg"
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Col>
                    <Col span={6}>
                        <Statistic
                            title="Total Revenue"
                            value={data.reduce((acc, curr) => acc + curr.totalRevenue, 0)}
                            precision={2}
                            prefix="₹"
                        />
                    </Col>
                </Row>

                <Table
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    rowKey="_id"
                    pagination={{
                        total: data.length,
                        pageSize: 50,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} items`
                    }}
                    scroll={{ x: 1000 }}
                    summary={pageData => {
                        let totalQty = 0;
                        let totalVol = 0;
                        let totalWgt = 0;
                        let totalRev = 0;

                        pageData.forEach(({ totalQuantitySold, totalLiters, totalKg, totalRevenue }) => {
                            totalQty += totalQuantitySold;
                            totalVol += totalLiters;
                            totalWgt += totalKg;
                            totalRev += totalRevenue;
                        });

                        return (
                            <Table.Summary fixed>
                                <Table.Summary.Row>
                                    <Table.Summary.Cell index={0} colSpan={4}><Text strong>Total</Text></Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} align="right"><Text strong>{totalQty}</Text></Table.Summary.Cell>
                                    <Table.Summary.Cell index={2} align="right"><Text strong>{totalVol.toFixed(2)} L</Text></Table.Summary.Cell>
                                    <Table.Summary.Cell index={3} align="right"><Text strong>{totalWgt.toFixed(2)} Kg</Text></Table.Summary.Cell>
                                    <Table.Summary.Cell index={4} align="right"><Text strong>₹{totalRev.toLocaleString()}</Text></Table.Summary.Cell>
                                </Table.Summary.Row>
                            </Table.Summary>
                        );
                    }}
                />
            </Card>
        </div>
    );
};

export default ProductSalesReport;
