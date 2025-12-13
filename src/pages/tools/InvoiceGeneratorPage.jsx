import React, { useState, useRef, useEffect } from 'react';
import SEO from '@/components/SEO';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle, ArrowLeft, Upload, Download, FileText, Banknote, Landmark, Wallet, Link2, CircleDollarSign, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { generateDocx } from '@/utils/docxGenerator';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const InvoiceGeneratorPage = () => {
    const { toast } = useToast();
    const invoicePrintRef = useRef();
    const logoInputRef = useRef(null);

    const [currency, setCurrency] = useState('₹');
    const [logo, setLogo] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState('INV-001');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    
    const [billFrom, setBillFrom] = useState('Your Company\n123 Street, City\nCountry, ZIP');
    const [billTo, setBillTo] = useState('Client Company\n456 Avenue, Town\nCountry, ZIP');

    const [items, setItems] = useState([
        { description: 'Item 1', quantity: 1, rate: 100, discount: 0, discountType: '%' },
    ]);
    
    const [notes, setNotes] = useState('Notes to be displayed on the invoice');
    const [terms, setTerms] = useState('Terms and conditions for this invoice');
    const [paymentMethod, setPaymentMethod] = useState('bank');
    const [paymentDetails, setPaymentDetails] = useState('Bank Name, Account Holder Name, Account Number, IFSC/SWIFT Code, etc...');

    const [tax, setTax] = useState(0);
    const [shipping, setShipping] = useState(0);
    const [overallDiscount, setOverallDiscount] = useState(0);
    const [overallDiscountType, setOverallDiscountType] = useState('%');
    
    const calculateItemAmount = (item) => {
        const itemTotal = item.quantity * item.rate;
        const itemDiscountAmount = item.discountType === '%'
            ? (itemTotal * item.discount) / 100
            : item.discount;
        return itemTotal - itemDiscountAmount;
    };
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalItemDiscount = items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.rate;
        return sum + (item.discountType === '%' ? (itemTotal * item.discount) / 100 : item.discount);
    }, 0);
    
    const discountedSubtotal = subtotal - totalItemDiscount;

    const overallDiscountAmount = overallDiscountType === '%'
        ? (discountedSubtotal * overallDiscount) / 100
        : overallDiscount;

    const taxableAmount = discountedSubtotal - overallDiscountAmount;
    const taxAmount = (taxableAmount * tax) / 100;
    const total = taxableAmount + taxAmount + parseFloat(shipping || 0);


    useEffect(() => {
        const nextInvoiceNumber = localStorage.getItem('invoiceNumber');
        if (nextInvoiceNumber) {
            setInvoiceNumber(nextInvoiceNumber);
        }
    }, []);

    const handleDownloadPDF = async () => {
        const element = invoicePrintRef.current;
        const opt = {
            margin: 10,
            filename: `Invoice-${invoiceNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        try {
            await html2pdf().set(opt).from(element).save();
            const num = parseInt((invoiceNumber.match(/\d+$/) || ['0'])[0]) + 1;
            const prefix = invoiceNumber.replace(/\d+$/, '');
            const nextInv = `${prefix || 'INV-'}${String(num).padStart(3, '0')}`;
            setInvoiceNumber(nextInv);
            localStorage.setItem('invoiceNumber', nextInv);
            toast({ title: 'PDF Downloaded!', description: 'Next invoice number has been updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate PDF.' });
        }
    };

    const handleDownloadDocx = async () => {
         const doc = generateDocx({
            invoiceNumber,
            date,
            dueDate,
            billFrom,
            billTo,
            items,
            subtotal,
            totalItemDiscount,
            overallDiscount,
            overallDiscountType,
            tax,
            shipping,
            total,
            notes,
            terms,
            paymentDetails,
            currency,
            logo,
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Invoice-${invoiceNumber}.docx`);
        toast({ title: 'DOCX Generated!', description: 'Your invoice has been downloaded.' });
    };


    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        let numValue = value;
        if (['quantity', 'rate', 'discount'].includes(field)) {
            numValue = parseFloat(value) || 0;
        }
        newItems[index][field] = numValue;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: 'New Item', quantity: 1, rate: 0, discount: 0, discountType: '%' }]);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };
    
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image file.' });
        }
    };
    
    const faqSchema = {
        "@type": "FAQPage",
        "mainEntity": [
            { "@type": "Question", "name": "How do I create an invoice?", "acceptedAnswer": { "@type": "Answer", "text": "Fill in your company and client details, add items with quantities and rates, set tax and discounts, then download as PDF or DOCX." } },
            { "@type": "Question", "name": "Can I add my company logo?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, upload your logo at the top of the form. It will appear on the invoice preview and final download." } },
            { "@type": "Question", "name": "Does the invoice number auto-increment?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, after each print/download, the invoice number automatically increments for your next invoice." } }
        ]
    };

    return (
        <>
            <SEO path="/tools/invoice-generator" faqSchema={faqSchema} />
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-secondary/5 to-background p-4 sm:p-6 lg:p-8">
                 <header className="flex items-center justify-between mb-8 non-printable">
                    <Button variant="ghost" asChild>
                        <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools</Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Invoice Generator</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDownloadDocx}><FileText className="mr-2 h-4 w-4" /> Download Word</Button>
                        <Button onClick={handleDownloadPDF}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 flex-1">
                    {/* Form Section */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3 space-y-6 non-printable">
                         <Card>
                            <CardContent className="p-6">
                                <Label htmlFor="logo-upload" className="w-full">
                                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
                                        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                                        <p className="mt-2 font-semibold">
                                            {logo ? 'Change Logo' : 'Upload Logo'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG, Recommended: 240x100px</p>
                                    </div>
                                    <Input id="logo-upload" ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </Label>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Bill From</Label>
                                        <Textarea value={billFrom} onChange={(e) => setBillFrom(e.target.value)} rows={4} placeholder="Who is this invoice from?" />
                                    </div>
                                    <div>
                                        <Label>Bill To</Label>
                                        <Textarea value={billTo} onChange={(e) => setBillTo(e.target.value)} rows={4} placeholder="Who is this invoice to?" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div><Label>Invoice Number</Label><Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
                                    <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                                    <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Items</h3>
                                <div className="hidden md:grid md:grid-cols-12 gap-2 mb-2 font-semibold text-sm text-muted-foreground">
                                    <div className="col-span-5">Description</div>
                                    <div className="col-span-2">Qty</div>
                                    <div className="col-span-2">Rate</div>
                                    <div className="col-span-2">Discount</div>
                                    <div className="col-span-1">Amount</div>
                                </div>

                                <div className="space-y-4">
                                {items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-start">
                                        <Textarea className="col-span-12 md:col-span-5" placeholder="Item description" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} rows={1} />
                                        <Input className="col-span-6 md:col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
                                        <Input className="col-span-6 md:col-span-2" type="number" placeholder="Rate" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)} />
                                        <div className="col-span-10 md:col-span-2 flex items-center">
                                            <Input type="number" value={item.discount} onChange={e => handleItemChange(index, 'discount', e.target.value)} className="rounded-r-none"/>
                                            <select value={item.discountType} onChange={e => handleItemChange(index, 'discountType', e.target.value)} className="h-10 border border-input bg-background rounded-l-none rounded-r-md px-2 text-sm">
                                                <option>%</option>
                                                <option>{currency}</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 md:col-span-1 text-right text-sm pt-2">{currency}{calculateItemAmount(item).toFixed(2)}</div>
                                        <Button variant="ghost" size="icon" className="col-span-1 md:col-start-13" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={addItem} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>

                                <div className="mt-8 pt-6 border-t">
                                    <div className="flex justify-end">
                                        <div className="w-full md:w-1/2 space-y-3">
                                            <div className="flex justify-between items-center"><Label>Subtotal</Label><span className="font-medium">{currency}{subtotal.toFixed(2)}</span></div>
                                            <div className="flex justify-between items-center"><Label>Item Discounts</Label><span className="font-medium text-destructive">-{currency}{totalItemDiscount.toFixed(2)}</span></div>
                                            <div className="flex justify-between items-center"><Label>Discount</Label>
                                                <div className="flex items-center w-36">
                                                     <Input type="number" value={overallDiscount} onChange={e => setOverallDiscount(parseFloat(e.target.value) || 0)} className="rounded-r-none text-right"/>
                                                     <select value={overallDiscountType} onChange={e => setOverallDiscountType(e.target.value)} className="h-10 border border-input bg-background rounded-l-none rounded-r-md px-2 text-sm">
                                                         <option>%</option>
                                                         <option>{currency}</option>
                                                     </select>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center"><Label>Tax (%)</Label><Input type="number" value={tax} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} className="w-36 text-right" /></div>
                                            <div className="flex justify-between items-center"><Label>Shipping</Label><Input type="number" value={shipping} onChange={(e) => setShipping(parseFloat(e.target.value) || 0)} className="w-36 text-right" /></div>
                                            <div className="flex justify-between items-center text-lg font-bold mt-4 pt-2 border-t"><Label>Total</Label><span>{currency}{total.toFixed(2)}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                             <CardContent className="p-6">
                                <Label className="text-lg font-semibold">How does this invoice get paid?</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="bank" id="bank" /><Label htmlFor="bank" className="flex items-center gap-2"><Landmark size={16}/> Bank Transfer</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="paypal" id="paypal"/><Label htmlFor="paypal" className="flex items-center gap-2"><Wallet size={16}/> PayPal</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="upi" id="upi"/><Label htmlFor="upi" className="flex items-center gap-2"><Banknote size={16}/> UPI</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="link" id="link"/><Label htmlFor="link" className="flex items-center gap-2"><Link2 size={16}/> Payment Link</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash"/><Label htmlFor="cash" className="flex items-center gap-2"><CircleDollarSign size={16}/> Cash</Label></div>
                                    </RadioGroup>
                                    <div className="bg-secondary/50 p-4 rounded-lg border border-dashed">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-2"><Info size={16}/><span>Enter {paymentMethod} details</span></div>
                                        <Textarea value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} rows={5} placeholder="Payment details..."/>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes for the client?" /></div>
                                    <div><Label>Terms</Label><Textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Terms and conditions" /></div>
                                </div>
                            </CardContent>
                        </Card>

                    </motion.div>

                    {/* Preview Section */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-lg overflow-auto max-h-[calc(100vh-120px)] sticky top-8">
                            <div ref={invoicePrintRef} className="p-6 sm:p-8 md:p-10 text-gray-800 font-sans text-[9pt] sm:text-[10pt] leading-normal">
                                <header className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 sm:pb-6 mb-6 sm:mb-8 border-b-2 border-gray-800">
                                    {logo ? <img src={logo} alt="Company Logo" className="max-h-[50px] sm:max-h-[60px] max-w-[150px] sm:max-w-[180px]" /> : <div className="h-[50px] sm:h-[60px] w-[150px] sm:w-[180px] bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs sm:text-sm">Your Logo Here</div>}
                                    <div className="text-left sm:text-right">
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase text-gray-900">Invoice</h1>
                                        <p className="text-gray-600 mt-1 text-sm sm:text-base"># {invoiceNumber}</p>
                                    </div>
                                </header>
                                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-10">
                                    <div>
                                        <p className="font-bold text-gray-600 mb-1 text-xs sm:text-sm">FROM:</p>
                                        <pre className="font-sans whitespace-pre-wrap text-xs sm:text-sm">{billFrom}</pre>
                                    </div>
                                    <div className="sm:text-right">
                                        <p className="font-bold text-gray-600 mb-1 text-xs sm:text-sm">TO:</p>
                                        <pre className="font-sans whitespace-pre-wrap text-xs sm:text-sm">{billTo}</pre>
                                    </div>
                                </section>
                                <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-8 text-left sm:text-right mb-6 sm:mb-12">
                                    <div><p className="font-bold text-gray-600 text-xs sm:text-sm">Date:</p><p className="text-xs sm:text-sm">{date}</p></div>
                                    <div><p className="font-bold text-gray-600 text-xs sm:text-sm">Due Date:</p><p className="text-xs sm:text-sm">{dueDate || 'N/A'}</p></div>
                                    <div><p className="font-bold text-gray-600 text-xs sm:text-sm">Total Amount:</p><p className="text-lg sm:text-xl font-bold text-gray-900">{currency}{total.toFixed(2)}</p></div>
                                </section>
                                <section className="overflow-x-auto">
                                    <table className="w-full text-left text-xs sm:text-sm">
                                        <thead className="bg-gray-800 text-white">
                                            <tr>
                                                <th className="p-2 sm:p-3 font-semibold uppercase tracking-wider">Item</th>
                                                <th className="p-2 sm:p-3 text-right font-semibold uppercase tracking-wider">Qty</th>
                                                <th className="p-2 sm:p-3 text-right font-semibold uppercase tracking-wider">Rate</th>
                                                <th className="p-2 sm:p-3 text-right font-semibold uppercase tracking-wider">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, i) => (
                                                <tr key={i} className="border-b border-gray-200">
                                                    <td className="p-2 sm:p-3 align-top"><p className="font-semibold">{item.description}</p></td>
                                                    <td className="p-2 sm:p-3 text-right align-top">{item.quantity}</td>
                                                    <td className="p-2 sm:p-3 text-right align-top">{currency}{item.rate.toFixed(2)}</td>
                                                    <td className="p-2 sm:p-3 text-right align-top">{currency}{calculateItemAmount(item).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>
                                <section className="flex justify-end mt-4 sm:mt-6">
                                    <div className="w-full sm:w-80 space-y-1 sm:space-y-2 text-xs sm:text-sm">
                                        <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span>{currency}{subtotal.toFixed(2)}</span></div>
                                        {totalItemDiscount > 0 && <div className="flex justify-between"><span className="text-gray-600">Item Discounts:</span><span className="text-destructive">-{currency}{totalItemDiscount.toFixed(2)}</span></div>}
                                        {overallDiscountAmount > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount ({overallDiscount}{overallDiscountType}):</span><span className="text-destructive">-{currency}{overallDiscountAmount.toFixed(2)}</span></div>}
                                        {tax > 0 && <div className="flex justify-between"><span className="text-gray-600">Tax ({tax}%):</span><span>+{currency}{taxAmount.toFixed(2)}</span></div>}
                                        {shipping > 0 && <div className="flex justify-between"><span className="text-gray-600">Shipping:</span><span>+{currency}{shipping.toFixed(2)}</span></div>}
                                        <div className="flex justify-between font-bold text-base sm:text-lg border-t-2 border-gray-800 pt-2 mt-2"><span>Total Due:</span><span className="text-gray-900">{currency}{total.toFixed(2)}</span></div>
                                    </div>
                                </section>
                                <footer className="mt-8 sm:mt-16 text-gray-600 text-xs sm:text-sm">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-10">
                                        {notes && <div><h3 className="font-bold mb-1 text-gray-800">Notes</h3><pre className="font-sans whitespace-pre-wrap">{notes}</pre></div>}
                                        {terms && <div><h3 className="font-bold mb-1 text-gray-800">Terms</h3><pre className="font-sans whitespace-pre-wrap">{terms}</pre></div>}
                                    </div>
                                    {paymentDetails && <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200 text-center"><h3 className="font-bold mb-1 text-gray-800">Payment Details</h3><pre className="font-sans whitespace-pre-wrap">{paymentDetails}</pre></div>}
                                </footer>
                            </div>
                        </div>
                    </motion.div>
                </div>
                <Card className="w-full mt-8 non-printable">
                    <CardHeader>
                        <CardTitle>How to Use the Invoice Generator</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                        <p>Create professional invoices for your business in a few easy steps. Our generator provides a live preview as you type.</p>
                        <ol>
                            <li><strong>Company & Client Details:</strong> Upload your company logo and fill in your details under "Bill From" and your client's details under "Bill To".</li>
                            <li><strong>Invoice Information:</strong> Set the invoice number, date, and due date. The invoice number will automatically increment after each print/download.</li>
                            <li><strong>Add Items:</strong> Fill in the description, quantity, and rate for each service or product. You can add discounts per item in percentage or flat amount.</li>
                            <li><strong>Calculate Totals:</strong> Adjust the overall discount, tax rate, and shipping costs. The subtotal and total will be calculated automatically.</li>
                            <li><strong>Payment & Notes:</strong> Choose a payment method and provide the necessary details. Add any notes or terms and conditions for your client.</li>
                            <li><strong>Download:</strong> Once you are satisfied with the preview, click "Download PDF" for a printable version or "Download DOCX" for an editable Word document.</li>
                        </ol>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default InvoiceGeneratorPage;