import React, { useState, useEffect, useCallback, useRef } from 'react';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Download,
  Copy,
  Share2,
  Trash2,
  PlusCircle,
  Eye,
  EyeOff,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Github,
  Link as LinkIcon,
  Image as ImageIcon,
  Rss,
  MessageSquare,
  Sparkles,
  Palette,
  Upload,
  Square,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const socialPlatforms = {
  facebook: { icon: Facebook, placeholder: 'https://facebook.com/username' },
  instagram: { icon: Instagram, placeholder: 'https://instagram.com/username' },
  twitter: { icon: Twitter, placeholder: 'https://twitter.com/username' },
  linkedin: { icon: Linkedin, placeholder: 'https://linkedin.com/in/username' },
  youtube: { icon: Youtube, placeholder: 'https://youtube.com/channel/...' },
  github: { icon: Github, placeholder: 'https://github.com/username' },
  threads: { icon: Rss, placeholder: 'https://threads.net/@username' },
  whatsapp: { icon: MessageSquare, placeholder: 'https://wa.me/1234567890' },
};

const MagicQrCodeGeneratorPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: '', bio: '', image: '' });
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    github: '',
    threads: '',
    whatsapp: '',
  });
  const [customLinks, setCustomLinks] = useState([]);
  const [qrValue, setQrValue] = useState('');
  
  // QR Customization State
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [margin, setMargin] = useState(4);
  const [logoImage, setLogoImage] = useState(null);
  const [logoWidth, setLogoWidth] = useState(40);
  const [logoHeight, setLogoHeight] = useState(40);
  const logoInputRef = useRef(null);

  const handleProfileChange = (field, value) => {
    setProfile(p => ({ ...p, [field]: value }));
  };

  const handleSocialLinkChange = (platform, value) => {
    setSocialLinks(s => ({ ...s, [platform]: value }));
  };

  const handleCustomLinkChange = (index, field, value) => {
    const newLinks = [...customLinks];
    newLinks[index][field] = value;
    setCustomLinks(newLinks);
  };

  const addCustomLink = () => {
    setCustomLinks([...customLinks, { id: Date.now(), name: '', url: '', visible: true }]);
  };

  const removeCustomLink = (index) => {
    setCustomLinks(customLinks.filter((_, i) => i !== index));
  };
  
  const generateQrValue = useCallback(() => {
    const data = {
      profile: {
          name: profile.name,
          bio: profile.bio,
      },
      social: Object.fromEntries(Object.entries(socialLinks).filter(([_, v]) => v)),
      custom: customLinks.filter(link => link.name && link.url && link.visible)
                         .map(({name, url}) => ({name, url}))
    };

    if (Object.keys(data.social).length === 0 && data.custom.length === 0) {
        setQrValue('');
        return;
    }
    
    const jsonString = JSON.stringify(data);
    const base64String = btoa(unescape(encodeURIComponent(jsonString)));
    const url = `${window.location.origin}/show?data=${base64String}`;
    setQrValue(url);
  }, [profile, socialLinks, customLinks]);

  useEffect(() => {
    generateQrValue();
  }, [generateQrValue]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied!', description: 'The link has been copied to your clipboard.' });
    });
  };
  
  const downloadQrCode = () => {
      const canvas = document.getElementById('qr-canvas');
      if (!canvas) return;
      
      const borderSize = 40;
      const qrPadding = margin * 4;
      const newCanvas = document.createElement('canvas');
      newCanvas.width = canvas.width + qrPadding * 2 + borderSize * 2;
      newCanvas.height = canvas.height + qrPadding * 2 + borderSize * 2;
      const ctx = newCanvas.getContext('2d');
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
      
      ctx.fillStyle = bgColor;
      ctx.fillRect(borderSize, borderSize, canvas.width + qrPadding * 2, canvas.height + qrPadding * 2);
      
      ctx.drawImage(canvas, borderSize + qrPadding, borderSize + qrPadding);
      
      newCanvas.toBlob((blob) => {
          saveAs(blob, 'magic-qr-profile.png');
      });
  };

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
        <PopoverContent className="w-auto p-0 border-0 bg-transparent">
            <HexColorPicker color={color} onChange={setColor} />
        </PopoverContent>
    </Popover>
  );

  const faqSchema = {
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "What is a Magic QR Profile?", "acceptedAnswer": { "@type": "Answer", "text": "It's a QR code that links to a beautiful page with all your social media and custom links in one place." } },
      { "@type": "Question", "name": "Do I need to create an account?", "acceptedAnswer": { "@type": "Answer", "text": "No, all your data is stored in the QR code itself. No registration or login required." } },
      { "@type": "Question", "name": "Can I customize the QR code?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, change colors, add your logo, and adjust the design to match your brand." } }
    ]
  };

  return (
    <>
      <SEO path="/tools/magic-qr-generator" faqSchema={faqSchema} />
      <div className="bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 text-white min-h-screen p-4 md:p-8">
        <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side: Form */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3"><Sparkles className="text-purple-400"/>Profile Information</CardTitle>
                <CardDescription className="text-gray-400">Add your basic details. This will be shown at the top of your links page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Your Name or Business Name" value={profile.name} onChange={e => handleProfileChange('name', e.target.value)} className="bg-white/10 border-white/20"/>
                <Textarea placeholder="A short bio or tagline..." value={profile.bio} onChange={e => handleProfileChange('bio', e.target.value)} className="bg-white/10 border-white/20"/>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3"><LinkIcon className="text-blue-400"/>Social Links</CardTitle>
                <CardDescription className="text-gray-400">Add your social media profiles. Empty fields will be ignored.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(socialPlatforms).map(([key, { icon: Icon, placeholder }]) => (
                  <div key={key} className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input placeholder={placeholder} value={socialLinks[key]} onChange={e => handleSocialLinkChange(key, e.target.value)} className="bg-white/10 border-white/20 pl-10"/>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3"><PlusCircle className="text-green-400"/>Custom Links</CardTitle>
                <CardDescription className="text-gray-400">Add any other links like your website, blog, or portfolio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AnimatePresence>
                {customLinks.map((link, index) => (
                  <motion.div key={link.id} layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                    <Input placeholder="Link Name (e.g., My Website)" value={link.name} onChange={e => handleCustomLinkChange(index, 'name', e.target.value)} className="bg-white/10 border-white/20"/>
                    <Input placeholder="https://example.com" value={link.url} onChange={e => handleCustomLinkChange(index, 'url', e.target.value)} className="bg-white/10 border-white/20"/>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor={`visible-${index}`}>{link.visible ? <Eye size={18}/> : <EyeOff size={18}/>}</Label>
                        <Switch id={`visible-${index}`} checked={link.visible} onCheckedChange={checked => handleCustomLinkChange(index, 'visible', checked)} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeCustomLink(index)}><Trash2 className="h-4 w-4 text-red-400"/></Button>
                  </motion.div>
                ))}
                </AnimatePresence>
                <Button variant="outline" onClick={addCustomLink} className="w-full border-dashed bg-transparent border-white/30 hover:bg-white/10">Add Custom Link</Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Side: QR Code Preview */}
          <div className="sticky top-8 space-y-8">
            <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-2xl shadow-purple-500/20">
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-3"><Wand2/> Your Magic QR Profile</CardTitle>
                <CardDescription className="text-purple-200">Scan this code to see all your links in one place. Your QR code updates automatically!</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                <div className="bg-white rounded-xl shadow-lg" style={{ background: bgColor, padding: `${margin * 4}px` }}>
                  {qrValue ? <QRCodeCanvas id="qr-canvas" value={qrValue} size={256} fgColor={fgColor} bgColor="transparent" level={"H"} imageSettings={logoImage ? { src: logoImage, height: logoHeight, width: logoWidth, excavate: true } : undefined} /> : <div className="w-64 h-64 flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg text-center p-4">Add at least one link to generate your QR code.</div>}
                </div>
                <AnimatePresence>
                {qrValue &&
                    <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="w-full space-y-3">
                        <div className="flex gap-3 w-full">
                           <Button onClick={downloadQrCode} className="w-full bg-white text-purple-600 hover:bg-gray-100"><Download className="mr-2 h-4 w-4"/>Download PNG</Button>
                           <Button onClick={() => navigate(qrValue)} variant="secondary" className="w-full bg-white/20 hover:bg-white/30"><Eye className="mr-2 h-4 w-4"/>Preview Page</Button>
                        </div>
                        <div className="flex gap-3 w-full">
                           <Button onClick={() => copyToClipboard(qrValue)} variant="outline" className="w-full bg-transparent border-white/30 text-white hover:bg-white/10"><Copy className="mr-2 h-4 w-4"/>Copy Link</Button>
                           <Button onClick={() => navigator.share({ title: 'My Links', url: qrValue })} variant="outline" className="w-full bg-transparent border-white/30 text-white hover:bg-white/10"><Share2 className="mr-2 h-4 w-4"/>Share</Button>
                        </div>
                    </motion.div>
                }
                </AnimatePresence>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader><CardTitle>Customize QR Code</CardTitle></CardHeader>
                <CardContent>
                    <Tabs defaultValue="colors">
                        <TabsList className="grid w-full grid-cols-2 bg-white/10">
                            <TabsTrigger value="colors"><Palette className="mr-2 h-4 w-4" />Colors</TabsTrigger>
                            <TabsTrigger value="logo"><Square className="mr-2 h-4 w-4" />Logo & Style</TabsTrigger>
                        </TabsList>
                        <TabsContent value="colors" className="space-y-6 pt-4">
                            <div className="space-y-2">
                                <Label>QR Code Color</Label>
                                <ColorPickerPopover color={fgColor} setColor={setFgColor}>
                                    <div className="w-full h-10 rounded-md border border-white/20 cursor-pointer" style={{ background: fgColor }}/>
                                </ColorPickerPopover>
                            </div>
                            <div className="space-y-2">
                                <Label>Background Color</Label>
                                <ColorPickerPopover color={bgColor} setColor={setBgColor}>
                                    <div className="w-full h-10 rounded-md border border-white/20 cursor-pointer" style={{ background: bgColor }}/>
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
                                    <Button variant="outline" className="w-full bg-transparent border-white/30" onClick={() => logoInputRef.current.click()}><Upload className="mr-2 h-4 w-4" /> Upload Logo</Button>
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

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader><CardTitle>How to Use</CardTitle></CardHeader>
              <CardContent className="prose prose-sm prose-invert max-w-none">
                  <ol>
                      <li><strong>Fill Your Profile:</strong> Add your name and a short bio.</li>
                      <li><strong>Add Links:</strong> Fill in your social media usernames and add any custom links like your website or blog.</li>
                      <li><strong>Customize QR:</strong> Use the customization panel to change colors, add a logo, or adjust the margin.</li>
                      <li><strong>Generate QR:</strong> Your QR code is created automatically as you type.</li>
                      <li><strong>Share:</strong> Download the QR code image or copy the link to share it. Anyone who scans it will see a beautiful page with all your links.</li>
                  </ol>
                  <p><strong>Note:</strong> This is a temporary profile generator. Your data is stored only in the QR code and URL. There is no account or database login.</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
};

export default MagicQrCodeGeneratorPage;