import React, { useState, useRef, useCallback } from 'react';
import SEO from '@/components/SEO';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Palette, Upload, Trash2, FileDown, Settings, Paintbrush, Square } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { saveAs } from 'file-saver';
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const QrCodeGeneratorPage = () => {
    const faqSchema = {
        "@type": "FAQPage",
        "mainEntity": [
            { "@type": "Question", "name": "How do I create a QR code?", "acceptedAnswer": { "@type": "Answer", "text": "Enter your text or URL in the input field, customize colors and logo if desired, then download as PNG or JPEG." } },
            { "@type": "Question", "name": "Can I add a logo to my QR code?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, upload your logo in the Logo & Style tab and adjust its size. The QR code will remain scannable." } },
            { "@type": "Question", "name": "What formats can I download?", "acceptedAnswer": { "@type": "Answer", "text": "You can download your custom QR code as PNG or JPEG in high resolution (512x512px)." } }
        ]
    };

    const [qrValue, setQrValue] = useState('https://ashwheel.com');
    const [fgColor, setFgColor] = useState('#000000');
    const [bgColor, setBgColor] = useState('#ffffff');
    const [margin, setMargin] = useState(2);
    const [logoImage, setLogoImage] = useState(null);
    const [logoWidth, setLogoWidth] = useState(40);
    const [logoHeight, setLogoHeight] = useState(40);
    const logoInputRef = useRef(null);

    const downloadQRCode = useCallback((format) => {
        const canvas = document.getElementById('qr-canvas-download');
        if (!canvas) return;

        const filename = 'ashwheel-qrcode';
        const borderSize = 40;
        const qrPadding = margin * 8;
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvas.width + qrPadding * 2 + borderSize * 2;
        newCanvas.height = canvas.height + qrPadding * 2 + borderSize * 2;
        const ctx = newCanvas.getContext('2d');
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(borderSize, borderSize, canvas.width + qrPadding * 2, canvas.height + qrPadding * 2);
        
        ctx.drawImage(canvas, borderSize + qrPadding, borderSize + qrPadding);

        if (format === 'png') {
            newCanvas.toBlob((blob) => {
                saveAs(blob, `${filename}.png`);
            });
        } else if (format === 'jpeg') {
            newCanvas.toBlob((blob) => {
                saveAs(blob, `${filename}.jpeg`);
            }, 'image/jpeg');
        }
    }, [bgColor, margin]);

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const ColorPickerPopover = ({ color, setColor, children }) => (
        <Popover>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0">
                <HexColorPicker color={color} onChange={setColor} />
            </PopoverContent>
        </Popover>
    );

    return (
        <>
        <SEO path="/tools/qr-code-generator" faqSchema={faqSchema} />
            <div className="container mx-auto py-8 px-4">
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>QR Code Generator</CardTitle>
                                <CardDescription>Enter text or a URL, customize your QR code, and download it instantly.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center justify-center gap-6">
                                <div className="rounded-lg" style={{ background: bgColor, padding: `${margin * 4}px` }}>
                                    <QRCodeSVG
                                        value={qrValue || 'https://ashwheel.com'}
                                        size={256}
                                        fgColor={fgColor}
                                        bgColor="transparent"
                                        level={"H"}
                                        imageSettings={logoImage ? {
                                            src: logoImage,
                                            height: logoHeight,
                                            width: logoWidth,
                                            excavate: true,
                                        } : undefined}
                                    />
                                </div>
                                 <div style={{ display: 'none' }}>
                                    <QRCodeCanvas
                                        id="qr-canvas-download"
                                        value={qrValue || 'https://ashwheel.com'}
                                        size={512}
                                        fgColor={fgColor}
                                        bgColor="transparent"
                                        level={"H"}
                                        imageSettings={logoImage ? {
                                            src: logoImage,
                                            height: logoHeight * 2,
                                            width: logoWidth * 2,
                                            excavate: true,
                                        } : undefined}
                                    />
                                </div>
                                <div className="w-full space-y-4">
                                     <Input
                                        type="text"
                                        value={qrValue}
                                        onChange={(e) => setQrValue(e.target.value)}
                                        placeholder="Enter text or URL"
                                        className="w-full text-center"
                                    />
                                    <div className="flex gap-2">
                                        <Button onClick={() => downloadQRCode('png')} className="w-full"><FileDown className="mr-2 h-4 w-4" />PNG</Button>
                                        <Button onClick={() => downloadQRCode('jpeg')} className="w-full"><FileDown className="mr-2 h-4 w-4" />JPEG</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Customize</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="colors">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="colors"><Palette className="mr-2 h-4 w-4" />Colors</TabsTrigger>
                                        <TabsTrigger value="logo"><Square className="mr-2 h-4 w-4" />Logo & Style</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="colors" className="space-y-6 pt-4">
                                        <div className="space-y-2">
                                            <Label>QR Code Color</Label>
                                            <ColorPickerPopover color={fgColor} setColor={setFgColor}>
                                                <div className="w-full h-10 rounded-md border cursor-pointer" style={{ background: fgColor }}/>
                                            </ColorPickerPopover>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Background Color</Label>
                                            <ColorPickerPopover color={bgColor} setColor={setBgColor}>
                                                <div className="w-full h-10 rounded-md border cursor-pointer" style={{ background: bgColor }}/>
                                            </ColorPickerPopover>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="logo" className="space-y-6 pt-4">
                                        <div className="space-y-2">
                                            <Label>Margin (Padding): {margin}</Label>
                                            <Slider min={0} max={10} step={1} value={[margin]} onValueChange={(v) => setMargin(v[0])} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Logo</Label>
                                             <Input type="file" accept="image/*" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" />
                                            {logoImage ? (
                                                <div className="flex items-center gap-2">
                                                    <img src={logoImage} alt="logo preview" className="w-10 h-10 border rounded"/>
                                                    <Button variant="destructive" size="icon" onClick={() => setLogoImage(null)}><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            ) : (
                                                <Button variant="outline" className="w-full" onClick={() => logoInputRef.current.click()}><Upload className="mr-2 h-4 w-4" /> Upload Logo</Button>
                                            )}
                                        </div>
                                        {logoImage && (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Logo Width: {logoWidth}px</Label>
                                                    <Slider min={20} max={80} step={1} value={[logoWidth]} onValueChange={(v) => setLogoWidth(v[0])} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Logo Height: {logoHeight}px</Label>
                                                    <Slider min={20} max={80} step={1} value={[logoHeight]} onValueChange={(v) => setLogoHeight(v[0])} />
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                 <Card className="w-full mt-8">
                    <CardHeader><CardTitle>How to Use</CardTitle></CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                      <ol>
                        <li><strong>Enter Data:</strong> Type or paste your text, link, or any data into the input box.</li>
                        <li><strong>Customize (Optional):</strong> Use the 'Customize' panel to change colors, add a margin, or upload a logo to appear in the center of your QR code.</li>
                        <li><strong>Download:</strong> Click the 'PNG' or 'JPEG' button to save your final QR code. Test the QR code with your camera to ensure it works correctly with your customizations.</li>
                      </ol>
                    </CardContent>
                 </Card>
            </div>
        </>
    );
};

export default QrCodeGeneratorPage;