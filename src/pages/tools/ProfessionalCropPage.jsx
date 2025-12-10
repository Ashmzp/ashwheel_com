import React, { useState, useRef } from 'react';
import SEO from '@/components/SEO';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Upload, Download } from 'lucide-react';
import ProfessionalCropTool from '@/components/ProfessionalCrop/ProfessionalCropTool';

const ProfessionalCropPage = () => {
    const [imageUrl, setImageUrl] = useState(null);
    const [croppedUrl, setCroppedUrl] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageUrl(event.target.result);
                setCroppedUrl(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (url, blob) => {
        setCroppedUrl(url);
    };

    const handleReset = () => {
        setImageUrl(null);
        setCroppedUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <>
            <SEO 
                path="/tools/professional-crop"
                title="Professional Photo Crop Tool - Free Online Image Cropper"
                description="Professional free-drag photo crop tool. Drag, resize, and rotate images naturally like Canva. No forced crop boxes."
            />
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
                <header className="flex items-center justify-between mb-8">
                    <Button variant="ghost" asChild>
                        <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tools</Link>
                    </Button>
                    <h1 className="text-xl sm:text-2xl font-bold text-primary">Professional Crop Tool</h1>
                    <Button onClick={handleReset} variant="outline">Start Over</Button>
                </header>

                <main className="flex-1 flex flex-col items-center max-w-6xl mx-auto w-full">
                    {!imageUrl ? (
                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle>Upload Your Image</CardTitle>
                                <CardDescription>Professional free-drag crop experience</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                                >
                                    <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                                    <p className="text-lg text-muted-foreground">Click to upload image</p>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="w-full space-y-6">
                            <ProfessionalCropTool 
                                imageUrl={imageUrl} 
                                onCropComplete={handleCropComplete}
                            />

                            {croppedUrl && (
                                <Card className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Cropped Result</h3>
                                    <div className="flex flex-col items-center gap-4">
                                        <img src={croppedUrl} alt="Cropped" className="max-w-md border rounded-lg" />
                                        <Button asChild>
                                            <a href={croppedUrl} download="ashwheel-cropped.png">
                                                <Download className="w-4 h-4 mr-2" />
                                                Download Cropped Image
                                            </a>
                                        </Button>
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}

                    <Card className="w-full mt-8">
                        <CardHeader>
                            <CardTitle>Features</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                <li>✅ Free-drag image manipulation</li>
                                <li>✅ Resize with corner handles</li>
                                <li>✅ Rotate 90° with one click</li>
                                <li>✅ Professional Canva-like experience</li>
                                <li>✅ No forced crop boxes</li>
                                <li>✅ High-quality output</li>
                            </ul>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </>
    );
};

export default ProfessionalCropPage;
