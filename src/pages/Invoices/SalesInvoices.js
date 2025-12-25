import React, { useState, useEffect, useRef } from 'react';
import {
    Table,
    Button,
    Space,
    Card,
    Typography,
    Tag,
    Modal,
    Input,
    message,
    Row,
    Col,
    Descriptions,
    Divider,
    Select,
    InputNumber,
    DatePicker,
    Form,
    Popconfirm,
    Tabs,
    Radio,
    Empty,
    Spin,
    Statistic,
    Badge,
    Alert,
} from 'antd';
import {
    PrinterOutlined,
    EyeOutlined,
    SearchOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    MinusCircleOutlined,
    CalculatorOutlined,
} from '@ant-design/icons';
import { invoicesAPI, dealersAPI, ordersAPI, customersAPI, dealerGroupsAPI, productsAPI } from '../../services/api';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

// Theme Constants
const THEME_BLUE = '#00AEEF';
const TEXT_DARK = '#333';
const TEXT_MUTED = '#666';
const BORDER_COLOR = '#E0E0E0';

// Enhanced Helper for Totals: Litres, Kg, and Package Breakdown
const calculateInvoiceDetails = (items) => {
    let totalLitres = 0;
    let totalKg = 0;
    const packageBreakdown = {};

    items.forEach(item => {
        const product = item.product || {};
        const packaging = product.packaging || {};
        const quantity = item.quantity || 0;

        // 1. Calculate Volume/Weight
        if (packaging.size?.value) {
            const sizeVal = parseFloat(packaging.size.value);
            const unit = packaging.size.unit?.toLowerCase();
            let multiplier = 1;

            // Handle multipacks (crate, carton, etc.)
            // If packaging type is a multipack, product.unit is the number of items inside
            if (['crate', 'carton', 'bag', 'box'].includes(packaging.type) && product.unit) {
                const parsedUnit = parseFloat(product.unit);
                if (!isNaN(parsedUnit)) multiplier = parsedUnit;
            }

            if (!isNaN(sizeVal)) {
                const totalUnits = quantity * multiplier;

                if (['ml', 'l', 'liter', 'liters'].includes(unit)) {
                    const litres = (unit === 'ml') ? (sizeVal / 1000) : sizeVal;
                    totalLitres += (litres * totalUnits);
                } else if (['g', 'gram', 'grams', 'kg', 'kilo', 'kilogram', 'kilograms'].includes(unit)) {
                    const kgs = (['g', 'gram', 'grams'].includes(unit)) ? (sizeVal / 1000) : sizeVal;
                    totalKg += (kgs * totalUnits);
                }
            }
        }

        // 2. Package Breakdown
        if (packaging.type) {
            const type = packaging.type.toLowerCase();
            // Standardize keys if needed, or just use as is
            if (packageBreakdown[type]) {
                packageBreakdown[type] += quantity;
            } else {
                packageBreakdown[type] = quantity;
            }
        }
    });

    return { totalLitres, totalKg, packageBreakdown };
};

// Number to Words Converter (Simplified for Indian Context - Lakhs/Crores if possible, or standard)
const numberToWords = (num) => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str + 'only';
};

const InvoiceDetails = React.forwardRef(({ invoice, mode }, ref) => {
    const isThermal = mode === 'thermal';

    // Helper to safely get address string
    const getAddressString = (addr) => {
        if (!addr) return '';
        return [
            addr.street,
            addr.city,
            addr.state,
            addr.zipCode,
            addr.country
        ].filter(Boolean).join(', ');
    };

    const buyerName = invoice?.buyer?.businessName || invoice?.buyer?.name || 'N/A';
    const buyerAddress = invoice?.buyer?.address || {};
    const companyAddress = invoice?.companyData?.address || {};

    // CSS Colors from Image
    const THEME_BLUE = '#00AEEF'; // Cyan/Blue shade from Sleek Bill
    const TEXT_DARK = '#333';
    const TEXT_MUTED = '#666';
    const BORDER_COLOR = '#E0E0E0';

    if (!invoice) return null;

    // Helper for tax calculations
    const getTaxDetails = (item) => {
        // Try to get rates from Invoice Item snapshot first, then fallback to Product
        // Product model structure: tax: { sgst: ..., cgst: ..., igst: ... }
        const sgstRate = item.sgstRate !== undefined ? item.sgstRate : (item.product?.tax?.sgst || 0);
        const cgstRate = item.cgstRate !== undefined ? item.cgstRate : (item.product?.tax?.cgst || 0);
        const igstRate = item.igstRate !== undefined ? item.igstRate : (item.product?.tax?.igst || 0);

        const totalRate = sgstRate + cgstRate + igstRate;

        let taxableValue = 0;
        if (item.total) { // item.total is usually tax inclusive in this system if taxMethod=inclusive
            // Check tax method (Invoice snapshot doesn't have it, assume inclusive or check product)
            const isInclusive = item.product?.taxMethod === 'inclusive';
            // Default to Inclusive if not specified, or derivation
            taxableValue = item.total / (1 + (totalRate / 100));
        }

        return {
            taxableValue,
            rate: totalRate,
            taxAmt: item.total - taxableValue,
            sgstRate, cgstRate, igstRate
        };
    };

    // Calculate Totals for Footer
    const totalTaxable = invoice.items.reduce((acc, item) => acc + getTaxDetails(item).taxableValue, 0);

    // Calculate Volume Summary
    let totalLitres = 0;
    let totalKg = 0;
    invoice.items.forEach(item => {
        const product = item.product || {};
        const packaging = product.packaging || {};
        const quantity = item.quantity || 0;
        if (packaging.size?.value) {
            const sizeVal = parseFloat(packaging.size.value);
            const unit = packaging.size.unit?.toLowerCase();
            let multiplier = 1;
            // Handle multipacks (crate, carton, etc.)
            if (['crate', 'carton', 'bag', 'box'].includes(packaging.type) && product.unit) {
                const parsedUnit = parseFloat(product.unit);
                if (!isNaN(parsedUnit)) multiplier = parsedUnit;
            }
            if (!isNaN(sizeVal)) {
                const totalUnits = quantity * multiplier;
                if (['ml', 'l', 'liter', 'liters'].includes(unit)) {
                    const litres = (unit === 'ml') ? (sizeVal / 1000) : sizeVal;
                    totalLitres += (litres * totalUnits);
                } else if (['g', 'gram', 'grams', 'kg', 'kilo', 'kilogram', 'kilograms'].includes(unit)) {
                    const kgs = (['g', 'gram', 'grams'].includes(unit)) ? (sizeVal / 1000) : sizeVal;
                    totalKg += (kgs * totalUnits);
                }
            }
        }
    });

    return (
        <div ref={ref} id="invoice-content" style={{ padding: isThermal ? '5px' : '30px', backgroundColor: '#fff', fontFamily: "'Inter', sans-serif" }}>
            {/* Global Print Styles */}
            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; padding: 0 !important; }
                    #invoice-content { padding: 20px !important; margin: 0 !important; width: 100% !important; }
                    .sleek-table th { background-color: #f0f8ff !important; color: ${THEME_BLUE} !important; -webkit-print-color-adjust: exact; }
                }
                .sleek-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .sleek-table th { text-align: left; padding: 6px 4px; border-top: 2px solid ${THEME_BLUE}; border-bottom: 2px solid ${THEME_BLUE}; color: ${THEME_BLUE}; font-weight: 700; font-size: 10px; text-transform: uppercase; }
                .sleek-table td { padding: 6px 4px; border-bottom: 1px solid ${BORDER_COLOR}; font-size: 11px; color: ${TEXT_DARK}; vertical-align: top; }
                .sleek-table tr:nth-child(even) { background-color: #fafafa; }
                .info-row { display: flex; margin-bottom: 3px; align-items: flex-start; }
                .info-icon { width: 16px; color: ${THEME_BLUE}; margin-right: 6px; font-size: 11px; }
                .info-text { flex: 1; font-size: 11px; color: ${TEXT_DARK}; line-height: 1.4; }
                .section-header { color: ${THEME_BLUE}; font-size: 12px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid ${BORDER_COLOR}; padding-bottom: 4px; font-style: italic; }
            `}</style>

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                {/* Logo & Company Name */}
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                        {invoice.companyData?.logo ? (
                            <img src={invoice.companyData.logo} alt="Logo" style={{ height: 45, marginRight: 15 }} />
                        ) : null}
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {invoice.companyData?.name?.split(' ')[0]} <span style={{ color: THEME_BLUE }}>{invoice.companyData?.name?.split(' ').slice(1).join(' ')}</span>
                            </div>
                            <div style={{ fontSize: '9px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase' }}>Billing Made Easier</div>
                        </div>
                    </div>
                </div>

                {/* Invoice Details */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: 2 }}>Original for Recipient</div>
                    <div style={{ fontSize: '22px', color: THEME_BLUE, fontWeight: 'bold', marginBottom: 5 }}>INVOICE {invoice.invoiceNumber}</div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', fontSize: '11px' }}>
                        <div>
                            <div style={{ color: '#666', fontWeight: 'bold' }}>Date</div>
                            <div>{dayjs(invoice.issueDate).format('MMMM DD, YYYY')}</div>
                        </div>
                        {invoice.dueDate && (
                            <div>
                                <div style={{ color: '#666', fontWeight: 'bold' }}>Due Date</div>
                                <div>{dayjs(invoice.dueDate).format('MMMM DD, YYYY')}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ADDRESS SECTION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                {/* Billed By */}
                <div style={{ width: '32%' }}>
                    <div className="section-header">{invoice.companyData?.name}</div>
                    <div className="info-row">
                        <div className="info-icon">🏠</div>
                        <div className="info-text">
                            {companyAddress.street}<br />
                            {companyAddress.city}, {companyAddress.state} - {companyAddress.zipCode}
                        </div>
                    </div>
                    {invoice.companyData?.gstNumber && <div className="info-row"><div className="info-icon">📜</div><div className="info-text">GSTIN: {invoice.companyData.gstNumber}</div></div>}
                    {invoice.companyData?.email && <div className="info-row"><div className="info-icon">📧</div><div className="info-text">{invoice.companyData.email}</div></div>}
                </div>

                {/* Bill To */}
                <div style={{ width: '32%' }}>
                    <div className="section-header">Bill To:</div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: 4 }}>{buyerName}</div>
                    <div className="info-row">
                        <div className="info-icon">🏠</div>
                        <div className="info-text">
                            {buyerAddress.street}<br />
                            {buyerAddress.city}, {buyerAddress.state} - {buyerAddress.zipCode}
                        </div>
                    </div>
                    {invoice.buyer?.gstNumber && <div className="info-row"><div className="info-icon">📜</div><div className="info-text">GSTIN: {invoice.buyer.gstNumber}</div></div>}
                    {invoice.buyer?.phone && <div className="info-row"><div className="info-icon">📞</div><div className="info-text">{invoice.buyer.phone}</div></div>}
                </div>

                {/* Shipping / Extra Details */}
                <div style={{ width: '30%' }}>
                    <div className="section-header">Details</div>
                    <div className="info-row"><span style={{ width: 90, color: TEXT_MUTED, fontSize: 11 }}>Payment Status:</span> <span style={{ fontWeight: 'bold' }}>{invoice.status?.toUpperCase()}</span></div>
                    <div className="info-row"><span style={{ width: 90, color: TEXT_MUTED, fontSize: 11 }}>Place of Supply:</span> <span>{buyerAddress.state || 'N/A'}</span></div>
                    {totalLitres > 0 && <div className="info-row"><span style={{ width: 90, color: TEXT_MUTED, fontSize: 11 }}>Total Approx Vol:</span> <span>{totalLitres.toFixed(1)} L</span></div>}
                    {totalKg > 0 && <div className="info-row"><span style={{ width: 90, color: TEXT_MUTED, fontSize: 11 }}>Total Approx Wgt:</span> <span>{totalKg.toFixed(1)} Kg</span></div>}
                </div>
            </div>

            {/* TABLE */}
            <table className="sleek-table">
                <thead>
                    <tr>
                        <th style={{ width: 30 }}>NO</th>
                        <th style={{ width: 220 }}>PRODUCT NAME</th>
                        <th>HSN/SAC</th>
                        <th style={{ textAlign: 'right' }}>QTY</th>
                        <th style={{ textAlign: 'right' }}>UNIT PRICE</th>
                        <th style={{ textAlign: 'right' }}>TAX</th>
                        <th style={{ textAlign: 'right' }}>AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, index) => {
                        const taxDetail = getTaxDetails(item);
                        const taxLabel = taxDetail.rate > 0
                            ? `${taxDetail.rate}%`
                            : '0%';
                        return (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>
                                    <div style={{ fontWeight: 'bold' }}>{item.productName || item.name}</div>
                                    <div style={{ color: '#888', fontSize: '9px' }}>{item.product?.sku ? `SKU: ${item.product.sku}` : ''}</div>
                                    <div style={{ color: '#999', fontSize: '9px', fontStyle: 'italic' }}>{item.product?.description}</div>
                                </td>
                                <td>{item.product?.hsnCode || '-'}</td>
                                <td style={{ textAlign: 'right' }}>{item.quantity} {isNaN(Number(item.unit)) ? item.unit : ''}</td>
                                <td style={{ textAlign: 'right' }}>{item.unitPrice.toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div>{taxLabel}</div>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.total.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* GST BREAKDOWN TABLE */}
            <div style={{ marginTop: 15, width: '100%' }}>
                <div style={{ fontSize: '10px', color: THEME_BLUE, fontWeight: 'bold', marginBottom: 2 }}>GST BREAKDOWN</div>
                <table className="sleek-table" style={{ marginTop: 0 }}>
                    <thead>
                        <tr>
                            <th style={{ fontSize: '9px', padding: '4px' }}>HSN/SAC</th>
                            <th style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>Taxable Value</th>
                            <th style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>SGST</th>
                            <th style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>CGST</th>
                            <th style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>IGST</th>
                            <th style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>Total Tax</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => {
                            const d = getTaxDetails(item);
                            const sgstAmt = d.taxableValue * (d.sgstRate / 100);
                            const cgstAmt = d.taxableValue * (d.cgstRate / 100);
                            const igstAmt = d.taxableValue * (d.igstRate / 100);
                            return (
                                <tr key={index + 'tax'}>
                                    <td style={{ fontSize: '9px', padding: '4px' }}>{item.product?.hsnCode || '-'}</td>
                                    <td style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>{d.taxableValue.toFixed(2)}</td>
                                    <td style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>{sgstAmt > 0 ? `${d.sgstRate}% (${sgstAmt.toFixed(2)})` : '-'}</td>
                                    <td style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>{cgstAmt > 0 ? `${d.cgstRate}% (${cgstAmt.toFixed(2)})` : '-'}</td>
                                    <td style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>{igstAmt > 0 ? `${d.igstRate}% (${igstAmt.toFixed(2)})` : '-'}</td>
                                    <td style={{ fontSize: '9px', textAlign: 'right', padding: '4px' }}>{(sgstAmt + cgstAmt + igstAmt).toFixed(2)}</td>
                                </tr>
                            );
                        })}
                        <tr>
                            <td style={{ fontSize: '9px', fontWeight: 'bold', padding: '4px' }}>Total</td>
                            <td style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'right', padding: '4px' }}>{typeof totalTaxable === 'number' ? totalTaxable.toFixed(2) : '0.00'}</td>
                            <td style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'right', padding: '4px' }} colSpan={3}></td>
                            <td style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'right', padding: '4px' }}>{invoice.pricing.taxAmount.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* FOOTER */}
            <div style={{ display: 'flex', marginTop: 20, borderTop: `2px solid ${THEME_BLUE}`, paddingTop: 15 }}>

                {/* Left Side: Words & Sign */}
                <div style={{ flex: 1, paddingRight: 40 }}>
                    <div style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 15 }}>
                        <div style={{ fontSize: '10px', color: '#666', marginBottom: 2 }}>Total in words:</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', fontStyle: 'italic', color: '#444' }}>
                            {numberToWords(Math.round(invoice.pricing.total)).toUpperCase()} RUPEES ONLY
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 30 }}>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '9px', color: THEME_BLUE, fontWeight: 'bold' }}>NOTE:</div>
                            <div style={{ fontSize: '9px', color: '#666', maxWidth: 200 }}>
                                Please check all goods upon delivery. No returns accepted after 24 hours.
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            {/* Placeholder for Signature */}
                            <div style={{ height: 35, borderBottom: '1px solid #000', width: 140, marginBottom: 5 }}></div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: THEME_BLUE }}>AUTHORIZED SIGNATORY</div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Totals */}
                <div style={{ width: 280 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '11px' }}>
                        <div style={{ color: '#666' }}>Total Before Tax</div>
                        <div style={{ fontWeight: 'bold' }}>{invoice.pricing.subtotal.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '11px' }}>
                        <div style={{ color: '#666' }}>Total Tax Amount</div>
                        <div style={{ fontWeight: 'bold' }}>{invoice.pricing.taxAmount.toFixed(2)}</div>
                    </div>
                    {invoice.pricing.discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '11px', color: 'green' }}>
                            <div>Discount</div>
                            <div>- {invoice.pricing.discount.toFixed(2)}</div>
                        </div>
                    )}
                    {invoice.pricing.globalDiscount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '11px', color: 'green' }}>
                            <div>Global Discount {invoice.pricing.globalDiscountType === 'percentage' ? `(${invoice.pricing.globalDiscount}%)` : ''}</div>
                            <div>
                                - {invoice.pricing.globalDiscountType === 'percentage'
                                    ? (((invoice.pricing.subtotal + invoice.pricing.taxAmount) * invoice.pricing.globalDiscount) / 100).toFixed(2)
                                    : invoice.pricing.globalDiscount.toFixed(2)}
                            </div>
                        </div>
                    )}
                    {invoice.pricing.customAdjustment && !isNaN(Number(invoice.pricing.customAdjustment.amount)) && Number(invoice.pricing.customAdjustment.amount) !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '11px' }}>
                            <div style={{ color: '#666' }}>{invoice.pricing.customAdjustment.name || invoice.pricing.customAdjustment.text || "Adjustment"}</div>
                            <div style={{ fontWeight: 'bold' }}>
                                {invoice.pricing.customAdjustment.operation === 'add' ? '+' : '-'}
                                {Math.abs(Number(invoice.pricing.customAdjustment.amount)).toFixed(2)}
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${BORDER_COLOR}`, fontSize: '13px' }}>
                        <div style={{ color: TEXT_DARK, fontWeight: 'bold' }}>TOTAL AMOUNT</div>
                        <div style={{ color: THEME_BLUE, fontWeight: 'bold', fontSize: '15px' }}>₹ {invoice.pricing.total.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '11px' }}>
                        <div style={{ color: '#666' }}>Amount Due</div>
                        <div style={{ color: THEME_BLUE, fontWeight: 'bold' }}>
                            ₹ {(invoice.pricing.total - (invoice.pricing.paidAmount || 0)).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const SalesInvoices = () => {
    // --- RESTORED ORIGINAL STATE & HANDLERS ---
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [printMode, setPrintMode] = useState('standard');

    useEffect(() => {
        fetchInvoices();
    }, [pagination.current, pagination.pageSize, searchText]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await invoicesAPI.getInvoices({
                page: pagination.current,
                limit: pagination.pageSize,
                search: searchText
            });
            const { invoices: data, pagination: paginationData } = response.data.data;
            setInvoices(data);
            setPagination(prev => ({ ...prev, total: paginationData.total }));
        } catch (error) {
            console.error('Error fetching invoices:', error);
            message.error('Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (paginationConfig) => {
        setPagination(paginationConfig);
    };

    const handleView = async (invoice) => {
        let fullInvoice = { ...invoice };
        if (invoice.type === 'dealer' && (invoice.buyer?._id || invoice.buyer)) {
            const dealerId = invoice.buyer?._id || invoice.buyer;
            try {
                const response = await dealersAPI.getDealer(dealerId);
                if (response.data?.data?.dealer) {
                    fullInvoice = {
                        ...fullInvoice,
                        buyer: {
                            ...fullInvoice.buyer,
                            ...response.data.data.dealer
                        }
                    };
                }
            } catch (error) { }
        }
        setSelectedInvoice(fullInvoice);
        setViewModalVisible(true);
        setPrintMode('standard');
    };

    const handleWindowPrint = async (mode) => {
        if (!selectedInvoice) return;
        if (mode === 'standard') {
            const printWindow = window.open('', '_blank');
            const invoiceContent = document.getElementById('invoice-content');
            if (printWindow && invoiceContent) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Invoice - ${selectedInvoice.invoiceNumber}</title>
                        <style>
                           @media print { @page { margin: 10mm; } body { -webkit-print-color-adjust: exact; } }
                           body { background: white; padding: 20px; font-family: 'Inter', sans-serif; }
                        </style>
                    </head>
                    <body><div id="invoice-content">${invoiceContent.innerHTML}</div></body>
                    </html>
                `);
                Array.from(document.querySelectorAll('style')).forEach(style => printWindow.document.head.appendChild(style.cloneNode(true)));
                printWindow.document.close();
                setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
            }
            return;
        }
        // Thermal Mode
        const printWindow = window.open('', '_blank');
        if (!printWindow) { message.error('Please allow popups'); return; }
        const invoice = selectedInvoice;
        const buyerName = invoice.buyer?.businessName || invoice.buyer?.name || 'N/A';
        const companyName = invoice.companyData?.name || 'Company Name';
        const htmlContent = `
             <!DOCTYPE html>
             <html>
             <head>
                 <title>Invoice #${invoice.invoiceNumber}</title>
                 <style>
                     body { font-family: 'Inter', sans-serif; margin: 0; padding: 10px; background: white; color: black; }
                     @media print { @page { margin: 0; size: 80mm auto; } body { -webkit-print-color-adjust: exact; } }
                     .text-right { text-align: right; }
                     table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                     th, td { font-size: 10px; padding: 4px; border-bottom: 1px dashed black; }
                 </style>
             </head>
             <body>
                 <div style="text-align: center; margin-bottom: 10px;">
                     <div style="font-weight: bold; font-size: 14px;">${companyName}</div>
                 </div>
                 <div style="text-align: center; margin-bottom: 10px; border-bottom: 1px dashed black;">
                     <div style="font-weight: bold;">INVOICE #${invoice.invoiceNumber}</div>
                     <div style="font-size: 10px;">${dayjs(invoice.issueDate).format('DD/MM/YY HH:mm')}</div>
                 </div>
                 <div style="font-size: 11px; margin-bottom: 5px;">To: <b>${buyerName}</b></div>
                 <table>
                     <thead><tr><th style="text-align:left">Item</th><th class="text-right">Qty</th><th class="text-right">Amt</th></tr></thead>
                     <tbody>
                         ${invoice.items.map(item => `<tr><td>${item.name}</td><td class="text-right">${item.quantity}</td><td class="text-right">${item.total.toFixed(0)}</td></tr>`).join('')}
                     </tbody>
                 </table>
                 <div style="margin-top: 10px; font-size: 11px;">
                     <div style="display:flex; justify-content:space-between;"><span>Total:</span><span>${invoice.pricing.total.toFixed(2)}</span></div>
                 </div>
                 <div style="text-align: center; margin-top: 20px; font-size: 10px;">Thank you!</div>
                 <script>window.onload = function() { window.print(); window.close(); }</script>
             </body>
             </html>
         `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const columns = [
        { title: 'Invoice No', dataIndex: 'invoiceNumber', key: 'invoiceNumber', render: (text) => <Text strong>{text}</Text> },
        { title: 'Order #', dataIndex: 'order', key: 'order', width: 100, render: (order) => order ? <Text>{order.orderNumber}</Text> : <Text type="secondary">-</Text> },
        { title: 'Customer/Dealer', key: 'buyer', render: (_, record) => <div><Text strong>{record.buyer?.businessName || record.buyer?.name}</Text><div style={{ fontSize: '12px', color: '#666' }}>{record.type === 'dealer' ? 'Dealer' : 'Customer'}</div></div> },
        { title: 'Date', dataIndex: 'issueDate', key: 'issueDate', render: (date) => dayjs(date).format('DD MMM YYYY') },
        {
            title: 'Receipt No',
            key: 'receipts',
            width: 150,
            render: (_, record) => (
                <div style={{ fontSize: '12px' }}>
                    {record.receipts && record.receipts.length > 0 ? (
                        record.receipts.map(r => (
                            <Tag key={r._id} color="purple" style={{ marginRight: 0, marginBottom: 2 }}>
                                {r.receiptNumber}
                            </Tag>
                        ))
                    ) : (
                        <Text type="secondary" style={{ fontSize: '11px' }}>-</Text>
                    )}
                </div>
            )
        },
        { title: 'Amount', dataIndex: 'pricing', key: 'amount', render: (pricing) => <Text strong>₹{pricing.total.toFixed(2)}</Text> },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status === 'paid' ? 'green' : 'blue'}>{status?.toUpperCase()}</Tag> },
        { title: 'Actions', key: 'actions', render: (_, record) => <Space><Button icon={<EyeOutlined />} onClick={() => handleView(record)}>View</Button></Space> }
    ];

    // --- NEW STATE FOR CREATE INVOICE ---
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [dealers, setDealers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [dealerPricing, setDealerPricing] = useState([]);
    const [stockAvailability, setStockAvailability] = useState({});

    // Order/Invoice Creation Form State
    const [orderType, setOrderType] = useState('customer'); // Default to customer for "one time"
    const [selectedBuyer, setSelectedBuyer] = useState(null);
    const [buyerBalance, setBuyerBalance] = useState(0);
    const [orderItems, setOrderItems] = useState([]);
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [globalDiscountType, setGlobalDiscountType] = useState('percentage');
    const [customAdjustment, setCustomAdjustment] = useState({ text: '', amount: 0, type: 'fixed', operation: 'subtract' });
    const [form] = Form.useForm();

    // Fetch master data when modal opens
    useEffect(() => {
        if (createModalVisible) {
            fetchDealers();
            fetchCustomers();
            fetchProducts();
        }
    }, [createModalVisible]);

    const fetchDealers = async () => {
        try {
            const response = await dealersAPI.getDealers({ limit: 100, status: 'active' });
            setDealers(response.data.data.dealers || []);
        } catch (error) { console.error('Error fetching dealers:', error); }
    };

    const fetchCustomers = async () => {
        try {
            const response = await customersAPI.getCustomers({ limit: 100 });
            setCustomers(response.data.data.customers || []);
        } catch (error) { console.error('Error fetching customers:', error); }
    };

    const fetchProducts = async () => {
        try {
            const response = await productsAPI.getProducts({ limit: 100, status: 'active' });
            const productList = response.data.data.products || [];
            setProducts(productList);

            if (productList.length > 0) {
                try {
                    const stockItems = productList.map(p => ({ product: p._id, quantity: 1 }));
                    const stockResponse = await ordersAPI.checkStock({
                        items: stockItems,
                        warehouse: 'Warehouse A'
                    });

                    if (stockResponse.data?.data?.stockCheck) {
                        const stockMap = {};
                        stockResponse.data.data.stockCheck.forEach(item => {
                            stockMap[item.productId] = item;
                        });
                        setStockAvailability(stockMap);
                    }
                } catch (stockError) {
                    console.error('Bulk stock check failed:', stockError);
                }
            }
        } catch (error) { console.error('Error fetching products:', error); }
    };

    const fetchDealerPricing = async (dealerId) => {
        if (!dealerId) { setDealerPricing([]); return; }
        try {
            const dealer = dealers.find(d => d._id === dealerId);
            let individualPricing = [];
            let groupPricing = [];
            try {
                const indResponse = await dealersAPI.getDealerPricing(dealerId);
                individualPricing = indResponse.data.data.pricing || [];
            } catch (err) { }

            if (dealer && dealer.dealerGroup) {
                const groupId = dealer.dealerGroup._id || dealer.dealerGroup;
                if (groupId) {
                    try {
                        const groupResponse = await dealerGroupsAPI.getDealerGroupPricing(groupId);
                        groupPricing = groupResponse.data.data.pricing || [];
                    } catch (err) { }
                }
            }

            const pricingMap = new Map();
            groupPricing.forEach(p => { if (p.product?._id) pricingMap.set(p.product._id, { ...p, _priority: 'group' }); });
            individualPricing.forEach(p => { if (p.product?._id) pricingMap.set(p.product._id, { ...p, _priority: 'individual' }); });
            setDealerPricing(Array.from(pricingMap.values()));
        } catch (error) { setDealerPricing([]); }
    };

    const handleOrderTypeChange = (type) => {
        setOrderType(type);
        setSelectedBuyer(null);
        setBuyerBalance(0);
        setDealerPricing([]);
        setOrderItems([]);
        setGlobalDiscount(0);
    };

    const handleBuyerChange = async (buyerId) => {
        setSelectedBuyer(buyerId);
        setOrderItems([]);
        if (orderType === 'dealer' && buyerId) {
            const dealer = dealers.find(d => d._id === buyerId);
            setBuyerBalance(dealer?.financialInfo?.currentBalance || 0);
            setGlobalDiscount(0);
            await fetchDealerPricing(buyerId);
        } else if (orderType === 'customer' && buyerId) {
            const customer = customers.find(c => c._id === buyerId);
            setBuyerBalance(customer?.financialInfo?.currentBalance || 0);
            const customerDiscount = customer?.financialInfo?.discountPercentage || 0;
            if (customerDiscount > 0) {
                setGlobalDiscount(customerDiscount);
                setGlobalDiscountType('percentage');
                message.info(`Applied customer discount: ${customerDiscount}%`);
            } else {
                setGlobalDiscount(0);
            }
            setDealerPricing([]);
        } else {
            setBuyerBalance(0);
            setGlobalDiscount(0);
            setDealerPricing([]);
        }
    };

    const getProductPrice = (productId) => {
        if (orderType === 'dealer' && dealerPricing.length > 0) {
            const pricing = dealerPricing.find(p => p.product._id === productId);
            if (pricing) {
                return {
                    price: pricing.pricing.finalPrice,
                    priceWithTax: pricing.tax.priceWithTax,
                    taxRate: pricing.tax.totalTax,
                    hasCustomPricing: true,
                };
            }
        }
        const product = products.find(p => p._id === productId);
        if (product) {
            const basePrice = product.price?.selling || 0;
            const taxRate = product.tax?.igst || product.tax?.cgst + product.tax?.sgst || 0;
            return {
                price: basePrice,
                priceWithTax: basePrice * (1 + taxRate / 100),
                taxRate: taxRate,
                hasCustomPricing: false,
            };
        }
        return { price: 0, priceWithTax: 0, taxRate: 0, hasCustomPricing: false };
    };

    const addOrderItem = () => {
        if (!selectedBuyer) { message.warning(`Please select a ${orderType} first`); return; }
        const newItem = {
            id: Date.now(),
            productId: '',
            productName: '',
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            discountType: 'percentage',
            igst: 0, cgst: 0, sgst: 0, taxAmount: 0, total: 0,
        };
        setOrderItems([...orderItems, newItem]);
    };

    const checkItemStock = async (productId, quantity) => {
        if (!productId) return;
        try {
            const response = await ordersAPI.checkStock({
                items: [{ product: productId, quantity: quantity || 1 }],
                warehouse: 'Warehouse A'
            });
            const stockInfo = response.data.data.stockCheck[0];
            setStockAvailability(prev => ({ ...prev, [productId]: stockInfo }));
        } catch (error) { }
    };

    const updateOrderItem = (index, field, value) => {
        const updatedItems = [...orderItems];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        if (field === 'productId' && value) {
            const product = products.find(p => p._id === value);
            const pricing = getProductPrice(value);
            if (product) {
                const igst = product.tax?.igst || 0;
                const cgst = product.tax?.cgst || 0;
                const sgst = product.tax?.sgst || 0;
                updatedItems[index] = {
                    ...updatedItems[index],
                    productName: product.name,
                    unitPrice: pricing.price,
                    igst, cgst, sgst,
                };
                // Calculate immediately
                const item = updatedItems[index];
                const subtotal = (item.unitPrice || 0) * (item.quantity || 0);
                const discountAmount = item.discountType === 'percentage' ? (subtotal * (item.discount || 0)) / 100 : (item.discount || 0);
                const afterDiscount = subtotal - discountAmount;
                const taxAmount = item.igst > 0 ? (afterDiscount * item.igst) / 100 : (afterDiscount * (item.cgst + item.sgst)) / 100;
                updatedItems[index].taxAmount = taxAmount;
                updatedItems[index].total = afterDiscount + taxAmount;
            }
        }

        if (['quantity', 'unitPrice', 'discount', 'discountType', 'igst', 'cgst', 'sgst'].includes(field)) {
            const item = updatedItems[index];
            const subtotal = (item.unitPrice || 0) * (item.quantity || 0);
            const discountAmount = item.discountType === 'percentage' ? (subtotal * (item.discount || 0)) / 100 : (item.discount || 0);
            const afterDiscount = subtotal - discountAmount;
            const taxAmount = item.igst > 0 ? (afterDiscount * item.igst) / 100 : (afterDiscount * (item.cgst + item.sgst)) / 100;
            updatedItems[index].taxAmount = taxAmount;
            updatedItems[index].total = afterDiscount + taxAmount;
        }

        if (field === 'productId' || field === 'quantity') {
            const productId = field === 'productId' ? value : updatedItems[index].productId;
            const quantity = field === 'quantity' ? value : updatedItems[index].quantity;
            if (productId && quantity > 0) checkItemStock(productId, quantity);
        }
        setOrderItems(updatedItems);
    };

    const removeOrderItem = (index) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    // Helper to calculate totals from a list of items (MATCHING ORDERS.JS)
    const calculateOrderDetailsHelper = (items) => {
        let totalLitres = 0;
        let totalKg = 0;
        let totalPackages = 0;
        const packageBreakdown = {};

        items.forEach(item => {
            let product = null;
            if (item.product && item.product.packaging) {
                product = item.product;
            } else if (item.productId) {
                product = products.find(p => p._id === item.productId);
            }

            const quantity = item.quantity || 0;

            if (product && product.packaging && ['crate', 'carton', 'bag', 'box'].includes(product.packaging.type)) {
                totalPackages += quantity;
                const type = product.packaging.type;
                packageBreakdown[type] = (packageBreakdown[type] || 0) + quantity;
            }

            if (product?.packaging?.size?.value) {
                let volume = parseFloat(product.packaging.size.value);
                const unit = product.packaging.size.unit?.toLowerCase();
                let multiplier = 1;

                if (['crate', 'carton', 'bag', 'box'].includes(product.packaging.type) && product.unit) {
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

        return { totalLitres, totalKg, totalPackages, packageBreakdown };
    };

    const calculateOrderTotals = () => {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let totalIgst = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let grandTotal = 0;

        orderItems.forEach(item => {
            const itemSubtotal = (item.unitPrice || 0) * (item.quantity || 0);
            subtotal += itemSubtotal;

            let discountAmount = 0;
            if (item.discountType === 'percentage') {
                discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
            } else {
                discountAmount = item.discount || 0;
            }
            totalDiscount += discountAmount;

            const itemTaxAmount = item.taxAmount || 0;
            totalTax += itemTaxAmount;

            if (item.igst > 0) {
                totalIgst += itemTaxAmount;
            } else {
                const totalTaxRate = (item.cgst || 0) + (item.sgst || 0);
                if (totalTaxRate > 0) {
                    totalCgst += (itemTaxAmount * (item.cgst || 0)) / totalTaxRate;
                    totalSgst += (itemTaxAmount * (item.sgst || 0)) / totalTaxRate;
                }
            }

            grandTotal += (item.total || 0);
        });

        const { totalLitres, totalKg, totalPackages, packageBreakdown } = calculateOrderDetailsHelper(orderItems);

        let globalDiscountAmount = 0;
        if (globalDiscountType === 'percentage') {
            globalDiscountAmount = (grandTotal * globalDiscount) / 100;
        } else {
            globalDiscountAmount = globalDiscount || 0;
        }

        let adjustmentAmount = 0;
        const op = customAdjustment.operation || 'subtract';
        const isAddition = op === 'add';

        if (customAdjustment.amount && customAdjustment.text?.trim()) {
            if (customAdjustment.type === 'percentage') {
                adjustmentAmount = (grandTotal * Number(customAdjustment.amount)) / 100;
            } else {
                adjustmentAmount = Number(customAdjustment.amount) || 0;
            }
        }

        let finalTotal = grandTotal - globalDiscountAmount;

        if (isAddition) {
            finalTotal = finalTotal + adjustmentAmount;
        } else {
            finalTotal = finalTotal - adjustmentAmount;
        }

        return {
            subtotal,
            totalDiscount,
            totalTax,
            totalIgst,
            totalCgst,
            totalSgst,
            grandTotal,
            globalDiscountAmount,
            adjustmentAmount,
            finalTotal,
            itemCount: orderItems.length,
            totalQuantity: orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
            totalLitres,
            totalKg,
            totalPackages,
            packageBreakdown
        };
    };

    const {
        subtotal, totalDiscount, totalTax, totalIgst, totalCgst, totalSgst,
        grandTotal, globalDiscountAmount, adjustmentAmount, finalTotal,
        totalLitres, totalKg, totalPackages, packageBreakdown
    } = calculateOrderTotals();

    const handleCreateInvoice = async () => {
        try {
            const values = await form.validateFields();
            if (orderItems.length === 0) { message.error('Please add at least one product'); return; }

            // Recalculate totals to ensure we have the latest values for the payload
            const totals = calculateOrderTotals();

            const orderData = {
                ...values,
                [orderType]: selectedBuyer,
                items: orderItems.map(item => ({
                    product: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                    discountType: item.discountType,
                    igst: item.igst,
                    cgst: item.cgst,
                    sgst: item.sgst,
                    taxAmount: item.taxAmount,
                    totalPrice: item.total
                })),
                payment: {
                    method: values.paymentMethod,
                    status: values.paymentMethod === 'credit' ? 'pending' : (values.status === 'delivered' ? 'completed' : 'pending'),
                    paidAmount: (values.status === 'delivered' && values.paymentMethod !== 'credit') ? totals.finalTotal : 0
                },
                pricing: {
                    subtotal: totals.subtotal,
                    tax: totals.totalTax,
                    total: totals.finalTotal, // IMPORTANT: Backend requires 'total'
                    globalDiscount,
                    globalDiscountType,
                    customAdjustment
                },
                shipping: {
                    method: 'pickup', // Default to pickup for direct invoices to avoid address validation
                    address: {
                        street: 'Counter Sale',
                        city: 'Local',
                        state: 'Local',
                        zipCode: '000000',
                        country: 'India'
                    }
                }
            };

            // Remove flat fields
            delete orderData.paymentMethod;

            setLoading(true);
            // 1. Create Order
            const orderRes = await ordersAPI.createOrder(orderData);
            if (orderRes.data.success) {
                const orderId = orderRes.data.data.order._id;
                message.success('Order created, applying invoice...');

                // 2. Generate Invoice
                const invRes = await invoicesAPI.createInvoiceFromOrder(orderId);
                if (invRes.data.success) {
                    message.success('Invoice created successfully!');
                    setCreateModalVisible(false);
                    fetchInvoices();
                    // Optionally open the view modal automatically
                    const newInvoice = invRes.data.data.invoice;
                    if (newInvoice) handleView(newInvoice);
                }
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            message.error(error.response?.data?.message || 'Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    const showCreateModal = () => {
        setCreateModalVisible(true);
        setOrderType('customer');
        setSelectedBuyer(null);
        setBuyerBalance(0);
        setOrderItems([]);
        setGlobalDiscount(0);
        setCustomAdjustment({ text: '', amount: 0, type: 'fixed', operation: 'subtract' });
        form.resetFields();
    };

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>Sales Invoices</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>
                    Create Direct Invoice
                </Button>
            </div>

            <Card>
                <div style={{ marginBottom: 16 }}>
                    <Space>
                        <Input
                            placeholder="Search Invoice No / Customer"
                            allowClear
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            style={{ width: 350, borderRadius: '8px' }}
                            onChange={e => {
                                const value = e.target.value;
                                setSearchText(value);
                                if (!value) setPagination(prev => ({ ...prev, current: 1 }));
                            }}
                            onPressEnter={() => setPagination(prev => ({ ...prev, current: 1 }))}
                        />
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={invoices}
                    rowKey="_id"
                    loading={loading}
                    pagination={pagination}
                    onChange={handleTableChange}
                />
            </Card>

            {/* CREATE INVOICE MODAL (Full Order Form Design) */}
            <Modal
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: 24 }}>
                        <Space>
                            <Text strong style={{ fontSize: 18 }}>Create Direct Invoice</Text>
                            <Tag color="blue">New Sale</Tag>
                        </Space>
                        <Space>
                            <Statistic title="Total" value={finalTotal} precision={2} prefix="₹" valueStyle={{ fontSize: 18, color: THEME_BLUE }} />
                        </Space>
                    </div>
                }
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                width="98%"
                onOk={handleCreateInvoice}
                confirmLoading={loading}
                okText="Generate Invoice"
                style={{ top: 10 }}
                bodyStyle={{ padding: '24px', height: '85vh', overflowY: 'auto' }}
            >
                <Form form={form} layout="vertical" initialValues={{ status: 'delivered', paymentMethod: 'cash', shippingMethod: 'pickup', deliveryDate: dayjs() }}>
                    <Row gutter={24}>
                        {/* LEFT COLUMN: Order Details & Products */}
                        <Col span={17}>
                            <Card type="inner" title="Buyer & Details" size="small" style={{ marginBottom: 16 }}>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item label="Buyer Type" style={{ marginBottom: 8 }}>
                                            <Radio.Group value={orderType} onChange={e => handleOrderTypeChange(e.target.value)} buttonStyle="solid">
                                                <Radio.Button value="customer">Customer</Radio.Button>
                                                <Radio.Button value="dealer">Dealer</Radio.Button>
                                            </Radio.Group>
                                        </Form.Item>
                                    </Col>
                                    <Col span={10}>
                                        <Form.Item label={`Select ${orderType === 'dealer' ? 'Dealer' : 'Customer'}`} required style={{ marginBottom: 8 }}>
                                            <Select
                                                showSearch
                                                placeholder={`Select ${orderType}`}
                                                value={selectedBuyer}
                                                onChange={handleBuyerChange}
                                                style={{ width: '100%' }}
                                                filterOption={(input, option) => {
                                                    const item = (orderType === 'dealer' ? dealers : customers).find(i => i._id === option.key);
                                                    if (item) {
                                                        const name = item.businessInfo?.companyName || item.businessName || item.fullName || item.displayName || `${item.personalInfo?.firstName || ''} ${item.personalInfo?.lastName || ''}`.trim() || item.name || '';
                                                        const phone = item.phone || item.personalInfo?.phone?.primary || '';
                                                        return name.toLowerCase().includes(input.toLowerCase()) || phone.includes(input);
                                                    }
                                                    return false;
                                                }}
                                            >
                                                {(orderType === 'dealer' ? dealers : customers).map(item => {
                                                    const name = item.businessInfo?.companyName || item.businessName || item.fullName || item.displayName || `${item.personalInfo?.firstName || ''} ${item.personalInfo?.lastName || ''}`.trim() || item.name || 'Unknown';
                                                    const phone = item.phone || item.personalInfo?.phone?.primary || '';
                                                    return (
                                                        <Option key={item._id} value={item._id}>
                                                            {name} {phone ? `(${phone})` : ''}
                                                        </Option>
                                                    );
                                                })}
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col span={6}>
                                        <Form.Item label="Current Balance" style={{ marginBottom: 8 }}>
                                            <Text type={buyerBalance > 0 ? "danger" : "success"} strong>₹ {buyerBalance.toFixed(2)}</Text>
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="deliveryDate" label="Invoice Date" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                                            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="paymentMethod" label="Payment Method" style={{ marginBottom: 0 }}>
                                            <Select>
                                                <Option value="cash">Cash</Option>
                                                <Option value="bank-transfer">Bank Transfer</Option>
                                                <Option value="digital-wallet">UPI / Digital Wallet</Option>
                                                <Option value="cheque">Cheque</Option>
                                                <Option value="credit">Credit / Postpay</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="status" label="Status" style={{ marginBottom: 0 }}>
                                            <Select>
                                                <Option value="delivered">Delivered</Option>
                                                <Option value="confirmed">Confirmed</Option>
                                                <Option value="pending">Pending</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>

                            <Card type="inner" title="Products" size="small" bodyStyle={{ padding: 0 }}>
                                <Table
                                    dataSource={orderItems}
                                    rowKey="id"
                                    pagination={false}
                                    size="small"
                                    columns={[
                                        {
                                            title: 'Product',
                                            dataIndex: 'productId',
                                            width: 250,
                                            render: (text, record, index) => (
                                                <Select
                                                    showSearch
                                                    placeholder="Select Product"
                                                    style={{ width: '100%' }}
                                                    value={record.productId}
                                                    onChange={(val) => updateOrderItem(index, 'productId', val)}
                                                    optionFilterProp="children"
                                                    dropdownMatchSelectWidth={false}
                                                    filterOption={(input, option) => {
                                                        const p = products.find(prod => prod._id === option.key);
                                                        return p?.name?.toLowerCase().includes(input.toLowerCase());
                                                    }}
                                                >
                                                    {products.map(p => {
                                                        const stock = stockAvailability[p._id]?.available || 0;
                                                        return (
                                                            <Option key={p._id} value={p._id} disabled={stock < 1}>
                                                                <Space>
                                                                    <span>{p.name}</span>
                                                                    <Tag color={stock > 10 ? 'green' : stock > 0 ? 'orange' : 'red'}>Stock: {stock}</Tag>
                                                                </Space>
                                                            </Option>
                                                        );
                                                    })}
                                                </Select>
                                            )
                                        },
                                        {
                                            title: 'Qty',
                                            dataIndex: 'quantity',
                                            width: 80,
                                            render: (text, record, index) => (
                                                <InputNumber min={1} value={record.quantity} onChange={val => updateOrderItem(index, 'quantity', val)} style={{ width: '100%' }} />
                                            )
                                        },
                                        {
                                            title: 'Price (₹)',
                                            dataIndex: 'unitPrice',
                                            width: 100,
                                            render: (text, record, index) => (
                                                <InputNumber min={0} value={record.unitPrice} onChange={val => updateOrderItem(index, 'unitPrice', val)} style={{ width: '100%' }} />
                                            )
                                        },
                                        {
                                            title: 'Disc',
                                            dataIndex: 'discount',
                                            width: 110,
                                            render: (text, record, index) => (
                                                <Space.Compact>
                                                    <InputNumber min={0} value={record.discount} onChange={val => updateOrderItem(index, 'discount', val)} style={{ width: 60 }} />
                                                    <Select value={record.discountType} onChange={val => updateOrderItem(index, 'discountType', val)} style={{ width: 50 }}>
                                                        <Option value="percentage">%</Option>
                                                        <Option value="fixed">₹</Option>
                                                    </Select>
                                                </Space.Compact>
                                            )
                                        },
                                        {
                                            title: 'Tax',
                                            width: 80,
                                            render: (_, record) => {
                                                const totalRate = (record.igst || 0) + (record.cgst || 0) + (record.sgst || 0);
                                                return <Text type="secondary" style={{ fontSize: 11 }}>{totalRate}%</Text>;
                                            }
                                        },
                                        {
                                            title: 'Total',
                                            dataIndex: 'total',
                                            width: 100,
                                            render: (val) => <Text strong>₹{val?.toFixed(2)}</Text>
                                        },
                                        {
                                            width: 40,
                                            render: (_, record, index) => (
                                                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeOrderItem(index)} size="small" />
                                            )
                                        }
                                    ]}
                                    footer={() => (
                                        <Button type="dashed" onClick={addOrderItem} block icon={<PlusOutlined />}>
                                            Add Product
                                        </Button>
                                    )}
                                />
                            </Card>
                        </Col>

                        {/* RIGHT COLUMN: Summary & Totals */}
                        <Col span={7}>
                            <Card title="Order Summary" size="small" style={{ height: '100%' }}>
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text type="secondary">Subtotal ({orderItems.length} items)</Text>
                                        <Text strong>₹ {subtotal.toFixed(2)}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text type="secondary">Item Discounts</Text>
                                        <Text type="success">- ₹ {totalDiscount.toFixed(2)}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text type="secondary">Total Tax</Text>
                                        <Text>₹ {totalTax.toFixed(2)}</Text>
                                    </div>

                                    {/* Tax Breakdown */}
                                    <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: 4, marginBottom: 12 }}>
                                        {totalIgst > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                                <Text type="secondary">IGST</Text>
                                                <Text>₹ {totalIgst.toFixed(2)}</Text>
                                            </div>
                                        )}
                                        {totalCgst > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                                <Text type="secondary">CGST</Text>
                                                <Text>₹ {totalCgst.toFixed(2)}</Text>
                                            </div>
                                        )}
                                        {totalSgst > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                                <Text type="secondary">SGST</Text>
                                                <Text>₹ {totalSgst.toFixed(2)}</Text>
                                            </div>
                                        )}
                                    </div>

                                    <Divider style={{ margin: '12px 0' }} />

                                    {/* Global Discount Input */}
                                    <div style={{ marginBottom: 12 }}>
                                        <Text style={{ fontSize: 12 }}>Global Discount</Text>
                                        <Space.Compact style={{ width: '100%' }}>
                                            <InputNumber min={0} value={globalDiscount} onChange={setGlobalDiscount} style={{ flex: 1 }} />
                                            <Select value={globalDiscountType} onChange={setGlobalDiscountType} style={{ width: 60 }}>
                                                <Option value="percentage">%</Option>
                                                <Option value="fixed">₹</Option>
                                            </Select>
                                        </Space.Compact>
                                    </div>

                                    {/* Custom Adjustment Input */}
                                    <div style={{ marginBottom: 12 }}>
                                        <Text style={{ fontSize: 12 }}>Adjustment / Extra Charge</Text>
                                        <Row gutter={8}>
                                            <Col span={24} style={{ marginBottom: 4 }}>
                                                <Input
                                                    placeholder="Reason (e.g. Delivery)"
                                                    value={customAdjustment.text}
                                                    onChange={e => setCustomAdjustment({ ...customAdjustment, text: e.target.value })}
                                                    size="small"
                                                />
                                            </Col>
                                            <Col span={24}>
                                                <Space.Compact style={{ width: '100%' }}>
                                                    <Select
                                                        value={customAdjustment.operation}
                                                        onChange={val => setCustomAdjustment({ ...customAdjustment, operation: val })}
                                                        style={{ width: 80 }}
                                                        size="small"
                                                    >
                                                        <Option value="add">Add (+)</Option>
                                                        <Option value="subtract">Sub (-)</Option>
                                                    </Select>
                                                    <InputNumber
                                                        min={0}
                                                        value={customAdjustment.amount}
                                                        onChange={val => setCustomAdjustment({ ...customAdjustment, amount: val })}
                                                        style={{ flex: 1 }}
                                                        size="small"
                                                        placeholder="Amount"
                                                    />
                                                </Space.Compact>
                                            </Col>
                                        </Row>
                                    </div>

                                    <Divider style={{ margin: '12px 0' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 16 }}>Grand Total</Text>
                                        <Title level={3} style={{ margin: 0, color: THEME_BLUE }}>
                                            ₹ {finalTotal.toFixed(2)}
                                        </Title>
                                    </div>

                                </div>
                            </Card>
                        </Col>
                    </Row>
                </Form>
            </Modal>



            <Modal
                title={null}
                open={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={null}
                width={printMode === 'thermal' ? 450 : 1000}
                style={{ top: 20 }}
            >
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Space>
                        <Button icon={<PrinterOutlined />} type="default" onClick={() => handleWindowPrint('thermal')}>Thermal Print</Button>
                        <Button icon={<PrinterOutlined />} type="primary" onClick={() => handleWindowPrint('standard')}>Standard Print</Button>
                    </Space>
                </div>

                <div style={{ border: '1px solid #eee', maxHeight: '70vh', overflow: 'auto', display: 'flex', justifyContent: 'center', background: '#fff', padding: '20px' }}>
                    <InvoiceDetails invoice={selectedInvoice} mode={printMode} />
                </div>
            </Modal>
        </div>
    );
};

export default SalesInvoices;
