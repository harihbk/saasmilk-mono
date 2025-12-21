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
    Divider
} from 'antd';
import {
    PrinterOutlined,
    EyeOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { invoicesAPI, dealersAPI } from '../../services/api'; // Added dealersAPI
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';

const { Title, Text } = Typography;

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
                                <td style={{ textAlign: 'right' }}>{item.quantity} {item.unit}</td>
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
                            <td style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'right', padding: '4px' }}>{totalTaxable.toFixed(2)}</td>
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
                    {invoice.pricing.customAdjustment && Number(invoice.pricing.customAdjustment.amount) !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '11px' }}>
                            <div style={{ color: '#666' }}>{invoice.pricing.customAdjustment.name || invoice.pricing.customAdjustment.text || "Adjustment"}</div>
                            <div style={{ fontWeight: 'bold' }}>
                                {invoice.pricing.customAdjustment.operation === 'add' ? '+' : '-'}
                                {Number(invoice.pricing.customAdjustment.amount).toFixed(2)}
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
    // Refs no longer used for printing but kept if needed for other logic, though we can remove them.
    const standardPrintRef = useRef();
    const thermalPrintRef = useRef();

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

    const [printMode, setPrintMode] = useState('standard');

    const handleView = async (invoice) => {
        let fullInvoice = { ...invoice };

        // Fetch full dealer details if needed (for address)
        if (invoice.type === 'dealer' && (invoice.buyer?._id || invoice.buyer)) {
            const dealerId = invoice.buyer?._id || invoice.buyer;
            try {
                const response = await dealersAPI.getDealer(dealerId);
                if (response.data?.data?.dealer) {
                    // Update buyer object with fresh dealer details
                    fullInvoice = {
                        ...fullInvoice,
                        buyer: {
                            ...fullInvoice.buyer,
                            ...response.data.data.dealer
                        }
                    };
                }
            } catch (error) {
                console.error('Error fetching dealer details:', error);
            }
        }

        setSelectedInvoice(fullInvoice);
        setViewModalVisible(true);
        setPrintMode('standard');
    };

    const handleWindowPrint = async (mode) => {
        if (!selectedInvoice) return;

        // If Standard Mode, use the WYSIWYG DOM copy method (matches Orders.js)
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
                           @media print {
                                @page { margin: 10mm; }
                                body { -webkit-print-color-adjust: exact; }
                           }
                           body { background: white; padding: 20px; font-family: 'Inter', sans-serif; }
                        </style>
                    </head>
                    <body>
                        <div id="invoice-content">${invoiceContent.innerHTML}</div>
                    </body>
                    </html>
                `);

                // Copy styles
                Array.from(document.querySelectorAll('style')).forEach(style => {
                    printWindow.document.head.appendChild(style.cloneNode(true));
                });
                Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
                    printWindow.document.head.appendChild(link.cloneNode(true));
                });

                printWindow.document.close();

                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
            return;
        }

        // THERMAL MODE: Manual HTML Construction (Legacy support for thermal printers)
        const isThermal = true;
        const invoice = selectedInvoice;
        const printWindow = window.open('', '_blank');

        if (!printWindow) {
            message.error('Please allow popups to print');
            return;
        }

        // Helper for address string
        const getAddress = (addr) => {
            if (!addr) return '';
            return [addr.street, addr.city].filter(Boolean).join(', ');
        };

        // Reuse the helper for totals
        const { totalLitres } = calculateInvoiceDetails(invoice.items);

        const buyerName = invoice.buyer?.businessName || invoice.buyer?.name || 'N/A';
        const companyName = invoice.companyData?.name || 'Company Name';
        const companyAddress = getAddress(invoice.companyData?.address);

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
                     <div style="font-size: 10px;">${companyAddress}</div>
                 </div>
                 <div style="text-align: center; margin-bottom: 10px; border-bottom: 1px dashed black;">
                     <div style="font-weight: bold;">INVOICE #${invoice.invoiceNumber}</div>
                     <div style="font-size: 10px;">${dayjs(invoice.issueDate).format('DD/MM/YY HH:mm')}</div>
                 </div>
                 <div style="font-size: 11px; margin-bottom: 5px;">To: <b>${buyerName}</b></div>

                 <table>
                     <thead><tr><th style="text-align:left">Item</th><th class="text-right">Qty</th><th class="text-right">Amt</th></tr></thead>
                     <tbody>
                         ${invoice.items.map(item => `
                             <tr>
                                 <td>${item.name}</td>
                                 <td class="text-right">${item.quantity}</td>
                                 <td class="text-right">${item.total.toFixed(0)}</td>
                             </tr>
                         `).join('')}
                     </tbody>
                 </table>
                 
                 <div style="margin-top: 10px; font-size: 11px;">
                     <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>${invoice.pricing.subtotal.toFixed(2)}</span></div>
                     ${invoice.pricing.discount > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Disc:</span><span>-${invoice.pricing.discount.toFixed(2)}</span></div>` : ''}
                     <div style="display:flex; justify-content:space-between;"><span>Tax:</span><span>${invoice.pricing.taxAmount.toFixed(2)}</span></div>
                     <div style="display:flex; justify-content:space-between; font-weight:bold; border-top:1px dashed black; margin-top:2px; padding-top:2px;"><span>Total:</span><span>${invoice.pricing.total.toFixed(2)}</span></div>
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
        {
            title: 'Invoice No',
            dataIndex: 'invoiceNumber',
            key: 'invoiceNumber',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Order #',
            dataIndex: 'order',
            key: 'order',
            width: 100,
            render: (order) => order ? <Text>{order.orderNumber}</Text> : <Text type="secondary">-</Text>,
        },
        {
            title: 'Customer/Dealer',
            key: 'buyer',
            render: (_, record) => (
                <div>
                    <Text strong>{record.buyer?.businessName || record.buyer?.name}</Text>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        {record.buyer?.phone}
                    </div>
                    <div style={{ fontSize: '10px', color: '#888' }}>
                        {record.type === 'dealer' ? 'Dealer' : 'Customer'}
                    </div>
                </div>
            ),
        },
        {
            title: 'Date',
            dataIndex: 'issueDate',
            key: 'issueDate',
            render: (date) => dayjs(date).format('DD MMM YYYY'),
        },
        {
            title: 'Items',
            key: 'items',
            render: (_, record) => (
                <div style={{ maxHeight: '60px', overflowY: 'auto' }}>
                    {record.items?.slice(0, 3).map((item, i) => (
                        <div key={i} style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.quantity} x {item.name}
                        </div>
                    ))}
                    {record.items?.length > 3 && (
                        <div style={{ fontSize: '10px', color: '#1890ff' }}>
                            +{record.items.length - 3} more...
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'pricing',
            key: 'amount',
            render: (pricing) => <Text strong>₹{pricing.total.toFixed(2)}</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const colors = { issued: 'blue', paid: 'green', cancelled: 'red', draft: 'orange' };
                return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => handleView(record)}>View</Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={2}>Sales Invoices</Title>
            </div>

            <Card>
                <div style={{ marginBottom: 16 }}>
                    <Space>
                        <Input.Search
                            placeholder="Search Invoice No / Customer"
                            allowClear
                            onSearch={value => { setSearchText(value); setPagination(prev => ({ ...prev, current: 1 })); }}
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
