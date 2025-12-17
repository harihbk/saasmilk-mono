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

const InvoiceDetails = React.forwardRef(({ invoice, mode }, ref) => {
    const isThermal = mode === 'thermal';

    // Helper to safely get address string
    const getAddressString = (addr) => {
        if (!addr) return '';
        return [
            addr.street,
            addr.city,
            !isThermal && addr.state,
            !isThermal && addr.zipCode,
            !isThermal && addr.country
        ].filter(Boolean).join(isThermal ? ', ' : ', ');
    };

    // Calculate Total Volume logic
    const calculateTotalVolume = (items) => {
        const totalVolume = items.reduce((acc, item) => {
            const product = item.product;
            if (product?.packaging?.size?.value) {
                let volume = parseFloat(product.packaging.size.value);
                const unit = product.packaging.size.unit?.toLowerCase();
                let multiplier = 1;

                // Handle 'crate' case: Multiply by product.unit (bottles per crate)
                if (product.packaging.type === 'crate' && product.unit) {
                    const parsedUnit = parseFloat(product.unit);
                    if (!isNaN(parsedUnit)) {
                        multiplier = parsedUnit;
                    }
                }

                // Convert to Liters based on unit
                if (unit === 'ml') {
                    volume = volume / 1000;
                } else if (unit === 'l' || unit === 'liter' || unit === 'liters') {
                    volume = volume; // already in liters
                } else {
                    return acc; // Skip non-volume items like grams/kg for now or handle them if needed
                }

                return acc + (volume * multiplier * item.quantity);
            }
            return acc;
        }, 0);
        return totalVolume;
    };

    const totalLiters = invoice ? calculateTotalVolume(invoice.items) : 0;

    const buyerName = invoice?.buyer?.businessName || invoice?.buyer?.name || 'N/A';
    const buyerAddress = getAddressString(invoice?.buyer?.address);
    const companyAddress = getAddressString(invoice?.companyData?.address);

    // Style for the container div
    const containerStyle = {
        padding: isThermal ? '10px' : '40px',
        backgroundColor: '#fff',
        fontFamily: 'Inter, sans-serif',
        visibility: 'visible',
        width: '100%',
        boxSizing: 'border-box'
    };

    if (!invoice) return null;

    return (
        <div ref={ref} style={containerStyle} className="invoice-print-container">
            {isThermal ? (
                // THERMAL LAYOUT (Single Column)
                <>
                    <div style={{ textAlign: 'center', marginBottom: 15 }}>
                        {invoice.companyData?.logo && (
                            <img src={invoice.companyData.logo} alt="Logo" style={{ maxHeight: 40, marginBottom: 5 }} />
                        )}
                        <Title level={5} style={{ marginBottom: 0 }}>{invoice.companyData?.name}</Title>
                        <div style={{ fontSize: '10px', whiteSpace: 'pre-wrap' }}>{companyAddress}</div>
                        {invoice.companyData?.gstNumber && <div style={{ fontSize: '10px' }}>GSTIN: {invoice.companyData.gstNumber}</div>}
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 10, borderBottom: '1px dashed black', paddingBottom: 5 }}>
                        <div style={{ fontWeight: 'bold' }}>INVOICE #{invoice.invoiceNumber}</div>
                        <div style={{ fontSize: '10px' }}>{dayjs(invoice.issueDate).format('DD MMM YYYY HH:mm')}</div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <div style={{ fontWeight: 'bold' }}>To:</div>
                        <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{buyerName}</div>
                        {invoice.buyer?.gstNumber && <div style={{ fontSize: '10px' }}>GSTIN: {invoice.buyer.gstNumber}</div>}
                    </div>
                </>
            ) : (
                // STANDARD LAYOUT (Bill To Left, Company Right)
                <Row justify="space-between" align="top" style={{ marginBottom: 40 }}>
                    {/* LEFT COLUMN: BILL TO */}
                    <Col span={12} style={{ textAlign: 'left' }}>
                        <div style={{ marginBottom: 20 }}>
                            <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Bill To:</Text>
                            <Title level={4} style={{ marginTop: 5, marginBottom: 5 }}>{buyerName}</Title>
                            <div style={{ fontSize: '13px', whiteSpace: 'pre-wrap', color: '#555', maxWidth: '300px' }}>
                                {buyerAddress}
                            </div>
                            {invoice.buyer?.gstNumber && <div style={{ fontSize: '13px', marginTop: 5 }}>GSTIN: {invoice.buyer.gstNumber}</div>}
                            {invoice.buyer?.phone && <div style={{ fontSize: '13px' }}>Phone: {invoice.buyer.phone}</div>}
                            {invoice.buyer?.email && <div style={{ fontSize: '13px' }}>Email: {invoice.buyer.email}</div>}
                        </div>
                    </Col>

                    {/* RIGHT COLUMN: COMPANY INFO & INVOICE DETAILS */}
                    <Col span={12} style={{ textAlign: 'right' }}>
                        <div style={{ marginBottom: 20 }}>
                            {invoice.companyData?.logo && (
                                <img src={invoice.companyData.logo} alt="Logo" style={{ maxHeight: 60, marginBottom: 15 }} />
                            )}
                            <Title level={3} style={{ marginBottom: 0 }}>{invoice.companyData?.name}</Title>
                            <div style={{ fontSize: '13px', color: '#555' }}>
                                {invoice.companyData?.address?.street}<br />
                                {[
                                    invoice.companyData?.address?.city,
                                    invoice.companyData?.address?.state,
                                    invoice.companyData?.address?.zipCode
                                ].filter(Boolean).join(', ')}<br />
                                {invoice.companyData?.address?.country}
                            </div>
                            {invoice.companyData?.gstNumber && <div style={{ fontSize: '13px' }}>GSTIN: {invoice.companyData.gstNumber}</div>}
                            {invoice.companyData?.email && <div style={{ fontSize: '13px' }}>Email: {invoice.companyData.email}</div>}
                            {invoice.companyData?.phone && <div style={{ fontSize: '13px' }}>Phone: {invoice.companyData.phone}</div>}
                        </div>

                        <div style={{ marginTop: 30 }}>
                            <Title level={2} style={{ color: '#1890ff', margin: 0 }}>INVOICE</Title>
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>#{invoice.invoiceNumber}</div>
                            <div style={{ fontSize: '13px', marginTop: 5 }}>Date: <Text strong>{dayjs(invoice.issueDate).format('DD MMM YYYY')}</Text></div>
                            {invoice.dueDate && <div style={{ fontSize: '13px' }}>Due Date: <Text strong>{dayjs(invoice.dueDate).format('DD MMM YYYY')}</Text></div>}
                        </div>
                    </Col>
                </Row>
            )}

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #000' }}>
                        <th style={{ padding: '8px 0', textAlign: 'left', fontSize: isThermal ? '10px' : '13px' }}>Item</th>
                        <th style={{ padding: '8px 0', textAlign: 'right', fontSize: isThermal ? '10px' : '13px' }}>Qty</th>
                        {!isThermal && <th style={{ padding: '8px 0', textAlign: 'right', fontSize: '13px' }}>Rate</th>}
                        <th style={{ padding: '8px 0', textAlign: 'right', fontSize: isThermal ? '10px' : '13px' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, index) => {
                        const product = item.product;
                        let displayName = item.name;
                        if (product?.packaging) {
                            if (product.packaging.type === 'crate' && product.unit) {
                                displayName += ` (${product.packaging.type} of ${product.unit} x ${product.packaging.size?.value}${product.packaging.size?.unit})`;
                            } else if (product.packaging.type) {
                                displayName += ` (${product.packaging.type} ${product.packaging.size?.value}${product.packaging.size?.unit})`;
                            }
                        }

                        return (
                            <tr key={index} style={{ borderBottom: isThermal ? 'none' : '1px solid #eee' }}>
                                <td style={{ padding: '8px 0', textAlign: 'left', fontSize: isThermal ? '10px' : '13px' }}>
                                    <div style={{ fontWeight: 500 }}>{displayName}</div>
                                </td>
                                <td style={{ padding: '8px 0', textAlign: 'right', fontSize: isThermal ? '10px' : '13px' }}>{item.quantity}</td>
                                {!isThermal && <td style={{ padding: '8px 0', textAlign: 'right', fontSize: '13px' }}>{item.unitPrice.toFixed(2)}</td>}
                                <td style={{ padding: '8px 0', textAlign: 'right', fontSize: isThermal ? '10px' : '13px' }}>{item.total.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Totals */}
            <Row justify="end">
                <Col span={isThermal ? 24 : 10}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: isThermal ? '1px dashed black' : 'none' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '4px', textAlign: 'right', fontSize: isThermal ? '10px' : '13px' }}>Subtotal:</td>
                                <td style={{ padding: '4px', textAlign: 'right', fontWeight: 500, fontSize: isThermal ? '10px' : '13px' }}>{invoice.pricing.subtotal.toFixed(2)}</td>
                            </tr>
                            {invoice.pricing.discount > 0 && (
                                <tr>
                                    <td style={{ padding: '4px', textAlign: 'right', fontSize: isThermal ? '10px' : '13px' }}>Discount:</td>
                                    <td style={{ padding: '4px', textAlign: 'right', color: 'green', fontSize: isThermal ? '10px' : '13px' }}>- {invoice.pricing.discount.toFixed(2)}</td>
                                </tr>
                            )}
                            <tr>
                                <td style={{ padding: '4px', textAlign: 'right', fontSize: isThermal ? '10px' : '13px' }}>Tax:</td>
                                <td style={{ padding: '4px', textAlign: 'right', fontSize: isThermal ? '10px' : '13px' }}>{invoice.pricing.taxAmount.toFixed(2)}</td>
                            </tr>
                            {/* Total Liters Row */}
                            {totalLiters > 0 && (
                                <tr>
                                    <td style={{ padding: '4px', textAlign: 'right', fontSize: isThermal ? '10px' : '13px', fontWeight: 'bold' }}>Total Lt:</td>
                                    <td style={{ padding: '4px', textAlign: 'right', fontSize: isThermal ? '10px' : '13px', fontWeight: 'bold' }}>{totalLiters.toFixed(2)} L</td>
                                </tr>
                            )}
                            <tr style={{ borderTop: isThermal ? '1px solid black' : '2px solid #ddd' }}>
                                <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', fontSize: isThermal ? '12px' : '16px' }}>Total:</td>
                                <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', fontSize: isThermal ? '12px' : '16px' }}>₹{invoice.pricing.total.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </Col>
            </Row>

            {/* Tax Breakdown */}
            {!isThermal && invoice.pricing.taxAmount > 0 && (
                <div style={{ marginTop: 30, paddingTop: 10, borderTop: '1px solid #eee' }}>
                    <Text strong style={{ fontSize: '12px' }}>Tax Breakdown:</Text>
                    <table style={{ width: '100%', marginTop: 5, fontSize: '11px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#fafafa' }}>
                                <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'left' }}>Tax Type</th>
                                <th style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.pricing.igstAmount > 0 && <tr><td style={{ padding: '4px', border: '1px solid #ddd' }}>IGST</td><td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'right' }}>{invoice.pricing.igstAmount.toFixed(2)}</td></tr>}
                            {invoice.pricing.cgstAmount > 0 && <tr><td style={{ padding: '4px', border: '1px solid #ddd' }}>CGST</td><td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'right' }}>{invoice.pricing.cgstAmount.toFixed(2)}</td></tr>}
                            {invoice.pricing.sgstAmount > 0 && <tr><td style={{ padding: '4px', border: '1px solid #ddd' }}>SGST</td><td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'right' }}>{invoice.pricing.sgstAmount.toFixed(2)}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: isThermal ? 20 : 50, textAlign: 'center', color: '#888', fontSize: isThermal ? '10px' : '12px' }}>
                <p>Thank you for your business!</p>
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

    const handleWindowPrint = (mode) => {
        if (!selectedInvoice) return;

        const isThermal = mode === 'thermal';
        const invoice = selectedInvoice;
        const printWindow = window.open('', '_blank');

        if (!printWindow) {
            message.error('Please allow popups to print');
            return;
        }

        // Helper for address string
        const getAddress = (addr) => {
            if (!addr) return '';
            return [
                addr.street,
                addr.city,
                !isThermal && addr.state,
                !isThermal && addr.zipCode,
                !isThermal && addr.country
            ].filter(Boolean).join(isThermal ? ', ' : ', ');
        };

        const calculateTotalVolume = (items) => {
            const totalVolume = items.reduce((acc, item) => {
                const product = item.product;
                if (product?.packaging?.size?.value) {
                    let volume = parseFloat(product.packaging.size.value);
                    const unit = product.packaging.size.unit?.toLowerCase();
                    let multiplier = 1;

                    // Handle 'crate' case: Multiply by product.unit (bottles per crate)
                    if (product.packaging.type === 'crate' && product.unit) {
                        const parsedUnit = parseFloat(product.unit);
                        if (!isNaN(parsedUnit)) {
                            multiplier = parsedUnit;
                        }
                    }

                    if (unit === 'ml') {
                        volume = volume / 1000;
                    } else if (unit === 'l' || unit === 'liter' || unit === 'liters') {
                        volume = volume;
                    } else {
                        return acc;
                    }
                    return acc + (volume * multiplier * item.quantity);
                }
                return acc;
            }, 0);
            return totalVolume;
        };

        const totalLiters = calculateTotalVolume(invoice.items);

        const buyerName = invoice.buyer?.businessName || invoice.buyer?.name || 'N/A';
        const buyerAddrObj = invoice.buyer?.address;
        const buyerAddress = getAddress(buyerAddrObj);

        const buyerGst = invoice.buyer?.gstNumber || invoice.buyer?.gstin || '';
        const buyerPhone = invoice.buyer?.phone || invoice.buyer?.phoneNumber || '';
        const buyerEmail = invoice.buyer?.email || '';

        // Get Company details
        const companyName = invoice.companyData?.name || 'Company Name';
        const companyAddrObj = invoice.companyData?.address;
        const companyAddress = getAddress(companyAddrObj);
        const companyGst = invoice.companyData?.gstNumber || '';

        // Standard Layout HTML (Flex Row: Left=BillTo, Right=Company)
        // Thermal Layout HTML (Center Column)

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice #${invoice.invoiceNumber}</title>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        margin: 0;
                        padding: ${isThermal ? '10px' : '40px'};
                        background-color: white;
                        color: #000;
                    }
                    @media print {
                        @page { margin: ${isThermal ? '0' : '1cm'}; size: ${isThermal ? '80mm auto' : 'auto'}; }
                        body { -webkit-print-color-adjust: exact; }
                    }
                    /* Layout Classes */
                    .container { width: 100%; max-width: ${isThermal ? '100%' : '800px'}; margin: 0 auto; }
                    .row { display: flex; justify-content: space-between; align-items: flex-start; }
                    .col-left { text-align: left; width: 48%; }
                    .col-right { text-align: right; width: 48%; }

                    /* Typography */
                    h1 { margin: 0; font-size: 24px; color: #333; }
                    h2 { margin: 0; font-size: 18px; color: #333; }
                    h3 { margin: 0; font-size: 14px; color: #666; text-transform: uppercase; }
                    .small-text { font-size: 12px; color: #555; line-height: 1.4; }

                    /* Table */
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
                    th { text-align: left; border-bottom: 2px solid #000; padding: 8px 4px; font-size: ${isThermal ? '10px' : '13px'}; }
                    td { padding: 8px 4px; border-bottom: 1px solid #eee; font-size: ${isThermal ? '10px' : '13px'}; }
                    .text-right { text-align: right; }

                    /* Totals */
                    .totals-container { display: flex; justify-content: flex-end; }
                    .totals-table td { border: none; padding: 4px; }
                    .total-row { border-top: 2px solid #000; font-weight: bold; font-size: 16px; }
                    .total-liters-row { font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    ${isThermal ? `
                        <!-- THERMAL HEADER -->
                        <div style="text-align: center; margin-bottom: 15px;">
                            ${invoice.companyData?.logo ? `<img src="${invoice.companyData.logo}" style="max-height: 40px; margin-bottom: 5px;">` : ''}
                            <div style="font-weight: bold; font-size: 16px;">${companyName}</div>
                            <div style="font-size: 10px;">${companyAddress}</div>
                            ${companyGst ? `<div style="font-size: 10px;">GSTIN: ${companyGst}</div>` : ''}
                        </div>
                        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px;">
                            <div style="font-weight: bold;">INVOICE #${invoice.invoiceNumber}</div>
                            <div style="font-size: 10px;">${dayjs(invoice.issueDate).format('DD MMM YYYY HH:mm')}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <div style="font-weight: bold;">To:</div>
                            <div>${buyerName}</div>
                        </div>
                    ` : `
                        <!-- STANDARD HEADER (Left: Bill To, Right: Company) -->
                        <div class="row" style="margin-bottom: 40px;">
                            <div class="col-left">
                                <div style="margin-bottom: 10px;">
                                    <h3>Bill To:</h3>
                                    <div style="font-size: 18px; font-weight: bold; margin: 5px 0;">${buyerName}</div>
                                    <div class="small-text" style="max-width: 250px;">${buyerAddress}</div>
                                    ${buyerGst ? `<div class="small-text" style="margin-top: 5px;">GSTIN: ${buyerGst}</div>` : ''}
                                    ${buyerPhone ? `<div class="small-text">Phone: ${buyerPhone}</div>` : ''}
                                    ${buyerEmail ? `<div class="small-text">Email: ${buyerEmail}</div>` : ''}
                                </div>
                            </div>
                            <div class="col-right">
                                ${invoice.companyData?.logo ? `<img src="${invoice.companyData.logo}" style="max-height: 60px; margin-bottom: 10px;">` : ''}
                                <div style="font-size: 20px; font-weight: bold;">${companyName}</div>
                                <div class="small-text">${companyAddress}</div>
                                ${companyGst ? `<div class="small-text">GSTIN: ${companyGst}</div>` : ''}

                                <div style="margin-top: 20px;">
                                    <h2 style="color: #1890ff;">INVOICE</h2>
                                    <div style="font-size: 16px; font-weight: bold;">#${invoice.invoiceNumber}</div>
                                    <div class="small-text">Date: ${dayjs(invoice.issueDate).format('DD MMM YYYY')}</div>
                                </div>
                            </div>
                        </div>
                    `}

                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th class="text-right">Qty</th>
                                ${!isThermal ? '<th class="text-right">Rate</th>' : ''}
                                <th class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoice.items.map(item => {
            const product = item.product;
            let displayName = item.name;
            if (product?.packaging) {
                if (product.packaging.type === 'crate' && product.unit) {
                    displayName += ` (${product.packaging.type} of ${product.unit} x ${product.packaging.size?.value}${product.packaging.size?.unit})`;
                } else if (product.packaging.type) {
                    displayName += ` (${product.packaging.type} ${product.packaging.size?.value}${product.packaging.size?.unit})`;
                }
            }
            return `
                                <tr>
                                    <td>${displayName}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    ${!isThermal ? `<td class="text-right">${item.unitPrice.toFixed(2)}</td>` : ''}
                                    <td class="text-right">${item.total.toFixed(2)}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>

                    <div class="totals-container">
                        <table class="totals-table" style="width: ${isThermal ? '100%' : '50%'}">
                            <tr>
                                <td class="text-right">Subtotal:</td>
                                <td class="text-right">${invoice.pricing.subtotal.toFixed(2)}</td>
                            </tr>
                            ${invoice.pricing.discount > 0 ? `
                            <tr>
                                <td class="text-right" style="color: green;">Discount:</td>
                                <td class="text-right" style="color: green;">-${invoice.pricing.discount.toFixed(2)}</td>
                            </tr>` : ''}
                            <tr>
                                <td class="text-right">Tax:</td>
                                <td class="text-right">${invoice.pricing.taxAmount.toFixed(2)}</td>
                            </tr>
                            ${totalLiters > 0 ? `
                            <tr class="total-liters-row">
                                <td class="text-right">Total Lt:</td>
                                <td class="text-right">${totalLiters.toFixed(2)} L</td>
                            </tr>` : ''}
                            <tr>
                                <td class="total-row text-right" style="padding-top: 10px;">Total:</td>
                                <td class="total-row text-right" style="padding-top: 10px;">₹${invoice.pricing.total.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="margin-top: 50px; text-align: center; color: #888; font-size: 12px;">
                        <p>Thank you for your business!</p>
                    </div>

                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </div>
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
