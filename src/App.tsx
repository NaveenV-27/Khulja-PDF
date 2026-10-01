import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Tools from './pages/Tools'
import Compress from './pages/tools/Compress'
import MergePdf from './pages/tools/MergePdf'
import SplitPdf from './pages/tools/SplitPdf'
import ImgToPdf from './pages/tools/ImgToPdf'
import BgRemove from './pages/tools/BgRemove'
import QrTools from './pages/tools/QrTools'
import Resume from './pages/tools/Resume'
import PdfEditor from './pages/tools/PdfEditor'
import DocxToPdf from './pages/tools/DocxToPdf'
import ImageResize from './pages/tools/ImageResize'
import ImageFilters from './pages/tools/ImageFilters'
import ImageCrop from './pages/tools/ImageCrop'
import AddBackground from './pages/tools/AddBackground'
import BulkResize from './pages/tools/BulkResize'
import ImageWatermark from './pages/tools/ImageWatermark'
import RotatePdf from './pages/tools/RotatePdf'
import WatermarkPdf from './pages/tools/WatermarkPdf'
import PdfToImage from './pages/tools/PdfToImage'
import PdfProtect from './pages/tools/PdfProtect'
import PdfUnlock from './pages/tools/PdfUnlock'
import PdfToWord from './pages/tools/PdfToWord'
import PdfToExcel from './pages/tools/PdfToExcel'
import SignPdf from './pages/tools/SignPdf'
import OcrPdf from './pages/tools/OcrPdf'
import RedactPdf from './pages/tools/RedactPdf'
import PassportPhoto from './pages/tools/PassportPhoto'
import IdPhoto from './pages/tools/IdPhoto'
import ImageCompress from './pages/tools/ImageCompress'
import ImageConvert from './pages/tools/ImageConvert'
import Prank from './pages/Prank'
import { useDevToolSniffer } from './hooks/useDevToolSniffer'

export default function App() {

  useDevToolSniffer()
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/caught-you" element={<Prank/>} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/tools/compress" element={<Compress />} />
        <Route path="/tools/pdf-editor" element={<PdfEditor />} />
        <Route path="/tools/merge" element={<MergePdf />} />
        <Route path="/tools/split" element={<SplitPdf />} />
        <Route path="/tools/img-to-pdf" element={<ImgToPdf />} />
        <Route path="/tools/docx-to-pdf" element={<DocxToPdf />} />
        <Route path="/tools/bg-remove" element={<BgRemove />} />
        <Route path="/tools/qr" element={<QrTools />} />
        <Route path="/tools/resume" element={<Resume />} />
        <Route path="/tools/image-resize" element={<ImageResize />} />
        <Route path="/tools/image-filters" element={<ImageFilters />} />
        <Route path="/tools/image-crop" element={<ImageCrop />} />
        <Route path="/tools/add-bg" element={<AddBackground />} />
        <Route path="/tools/bulk-resize" element={<BulkResize />} />
        <Route path="/tools/image-watermark" element={<ImageWatermark />} />
        <Route path="/tools/rotate-pdf" element={<RotatePdf />} />
        <Route path="/tools/watermark-pdf" element={<WatermarkPdf />} />
        <Route path="/tools/pdf-to-image" element={<PdfToImage />} />
        <Route path="/tools/pdf-protect" element={<PdfProtect />} />
        <Route path="/tools/pdf-unlock" element={<PdfUnlock />} />
        <Route path="/tools/pdf-to-word" element={<PdfToWord />} />
        <Route path="/tools/pdf-to-excel" element={<PdfToExcel />} />
        <Route path="/tools/sign-pdf" element={<SignPdf />} />
        <Route path="/tools/ocr-pdf" element={<OcrPdf />} />
        <Route path="/tools/redact-pdf" element={<RedactPdf />} />
        <Route path="/tools/passport-photo" element={<PassportPhoto />} />
        <Route path="/tools/id-photo" element={<IdPhoto />} />
        <Route path="/tools/image-compress" element={<ImageCompress />} />
        <Route path="/tools/image-convert" element={<ImageConvert />} />
      </Routes>
      <Footer />
    </>
  )
}