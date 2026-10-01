import { useState } from 'react'
import { Printer, Plus, Trash2 } from 'lucide-react'
import ToolShell from '../../components/layout/ToolShell'
import { SectionLabel, OptionRow } from '../../components/ui/index'

interface Exp { id: string; company: string; role: string; period: string; points: string }
interface Edu { id: string; school: string; degree: string; period: string; grade: string }

const uid = () => Math.random().toString(36).slice(2)

export default function Resume() {
  const [name, setName] = useState('Your Name')
  const [title, setTitle] = useState('Software Engineer')
  const [email, setEmail] = useState('you@email.com')
  const [phone, setPhone] = useState('+91 00000 00000')
  const [location, setLocation] = useState('City, Country')
  const [linkedin, setLinkedin] = useState('linkedin.com/in/yourprofile')
  const [github, setGithub] = useState('github.com/yourhandle')
  const [summary, setSummary] = useState('Results-driven engineer with experience building scalable web applications and data-driven solutions.')
  const [skills, setSkills] = useState('React, TypeScript, Node.js, Python, PostgreSQL, Docker, AWS')
  const [experience, setExperience] = useState<Exp[]>([
    { id: uid(), company: 'Company Name', role: 'Software Engineer Intern', period: 'Jun 2024 – Aug 2024', points: 'Built and deployed REST APIs using Node.js and Express\nReduced query time by 40% through database optimizations\nCollaborated with cross-functional teams on product features' },
  ])
  const [education, setEducation] = useState<Edu[]>([
    { id: uid(), school: 'IIT Delhi', degree: 'M.Tech in Computer Scinece & Engineering', period: '2024 – 2026', grade: 'CPI: 8.7' },
  ])

  const addExp = () => setExperience(prev => [...prev, { id: uid(), company: '', role: '', period: '', points: '' }])
  const updExp = (id: string, key: keyof Exp, val: string) => setExperience(prev => prev.map(e => e.id === id ? { ...e, [key]: val } : e))
  const delExp = (id: string) => setExperience(prev => prev.filter(e => e.id !== id))

  const addEdu = () => setEducation(prev => [...prev, { id: uid(), school: '', degree: '', period: '', grade: '' }])
  const updEdu = (id: string, key: keyof Edu, val: string) => setEducation(prev => prev.map(e => e.id === id ? { ...e, [key]: val } : e))
  const delEdu = (id: string) => setEducation(prev => prev.filter(e => e.id !== id))

  const printResume = () => {
    const style = document.createElement('style')
    style.id = 'print-style'
    style.textContent = `@media print { body > *:not(#resume-print-target) { display: none !important; } #resume-print-target { display: block !important; position: fixed; top: 0; left: 0; width: 100%; } }`
    document.head.appendChild(style)
    window.print()
    document.head.removeChild(style)
  }

  const inputCls = "w-full px-2.5 py-1.5 rounded-lg text-xs outline-none transition-colors"
  const inputStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }

  const options = (
    <div className="flex flex-col gap-4">
      <SectionLabel>Personal Info</SectionLabel>
      {[['Name', name, setName],['Title', title, setTitle],['Email', email, setEmail],['Phone', phone, setPhone],['Location', location, setLocation],['LinkedIn', linkedin, setLinkedin],['GitHub', github, setGithub]].map(([label, val, setter]) => (
        <OptionRow key={label as string} label={label as string}>
          <input className={inputCls} style={inputStyle} value={val as string} onChange={e => (setter as (v:string)=>void)(e.target.value)} />
        </OptionRow>
      ))}
    </div>
  )

  return (
    <ToolShell title="Resume Builder" subtitle="Build and export a professional resume as PDF" slug="resume" options={options}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Live Preview</p>
          <button onClick={printResume} className="btn-primary flex items-center gap-2 px-4 py-2 text-xs">
            <Printer size={13} /> Save as PDF
          </button>
        </div>

        {/* Resume preview */}
        <div id="resume-print-target"
          className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', color: '#111', border: '1px solid var(--border)', fontFamily: 'Georgia, serif', fontSize: 11, lineHeight: 1.5 }}>
          <div style={{ padding: '32px 36px', maxWidth: 800, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ borderBottom: '2px solid #F59E0B', paddingBottom: 14, marginBottom: 16 }}>
              <h1 style={{ fontFamily: 'Dosis, sans-serif', fontSize: 26, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', margin: 0 }}>{name}</h1>
              <p style={{ fontFamily: 'Dosis, sans-serif', fontSize: 13, color: '#F59E0B', fontWeight: 600, margin: '3px 0 8px' }}>{title}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 16px', fontSize: 11, color: '#444' }}>
                {[email, phone, location, linkedin, github].filter(Boolean).map(v => <span key={v}>{v}</span>)}
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontFamily: 'Dosis, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F59E0B', margin: '0 0 5px' }}>Summary</h2>
                <p style={{ margin: 0, color: '#333' }}>{summary}</p>
              </div>
            )}

            {/* Skills */}
            {skills && (
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontFamily: 'Dosis, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F59E0B', margin: '0 0 5px' }}>Skills</h2>
                <p style={{ margin: 0, color: '#333' }}>{skills}</p>
              </div>
            )}

            {/* Experience */}
            {experience.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontFamily: 'Dosis, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F59E0B', margin: '0 0 8px' }}>Experience</h2>
                {experience.map(exp => (
                  <div key={exp.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong style={{ fontFamily: 'Dosis, sans-serif', fontSize: 12, color: '#111' }}>{exp.role}</strong>
                      <span style={{ fontSize: 10, color: '#666' }}>{exp.period}</span>
                    </div>
                    <div style={{ color: '#555', fontSize: 11, marginBottom: 4 }}>{exp.company}</div>
                    {exp.points.split('\n').filter(Boolean).map((pt, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, color: '#333', marginBottom: 2 }}>
                        <span style={{ color: '#F59E0B', flexShrink: 0 }}>•</span>
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'Dosis, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F59E0B', margin: '0 0 8px' }}>Education</h2>
                {education.map(edu => (
                  <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <strong style={{ fontFamily: 'Dosis, sans-serif', fontSize: 12 }}>{edu.school}</strong>
                      <div style={{ color: '#555', fontSize: 11 }}>{edu.degree} {edu.grade && `· ${edu.grade}`}</div>
                    </div>
                    <span style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>{edu.period}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Summary */}
          <div className="card-glass rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Summary</p>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3}
              className="w-full px-2.5 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }} />
          </div>

          {/* Skills */}
          <div className="card-glass rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Skills (comma separated)</p>
            <textarea value={skills} onChange={e => setSkills(e.target.value)} rows={3}
              className="w-full px-2.5 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }} />
          </div>
        </div>

        {/* Experience */}
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Experience</p>
            <button onClick={addExp} className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-xs"><Plus size={12} /> Add</button>
          </div>
          {experience.map(exp => (
            <div key={exp.id} className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input placeholder="Company" value={exp.company} onChange={e => updExp(exp.id, 'company', e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <input placeholder="Role / Title" value={exp.role} onChange={e => updExp(exp.id, 'role', e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                <input placeholder="Period (e.g. Jun 2024 – Aug 2026)" value={exp.period} onChange={e => updExp(exp.id, 'period', e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs outline-none col-span-2" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <textarea placeholder="Bullet points (one per line)" value={exp.points} onChange={e => updExp(exp.id, 'points', e.target.value)} rows={3}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'Dosis, sans-serif' }} />
              <button onClick={() => delExp(exp.id)} className="flex items-center gap-1 text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
                <Trash2 size={11} /> Remove
              </button>
            </div>
          ))}
        </div>

        {/* Education */}
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)', fontFamily: 'Dosis, sans-serif' }}>Education</p>
            <button onClick={addEdu} className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-xs"><Plus size={12} /> Add</button>
          </div>
          {education.map(edu => (
            <div key={edu.id} className="mb-3 grid grid-cols-2 gap-2">
              <input placeholder="Institution" value={edu.school} onChange={e => updEdu(edu.id, 'school', e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <input placeholder="Degree / Program" value={edu.degree} onChange={e => updEdu(edu.id, 'degree', e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <input placeholder="Period" value={edu.period} onChange={e => updEdu(edu.id, 'period', e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <input placeholder="Grade / CPI" value={edu.grade} onChange={e => updEdu(edu.id, 'grade', e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <button onClick={() => delEdu(edu.id)} className="flex items-center gap-1 text-xs col-span-2" style={{ color: 'var(--text-3)' }}>
                <Trash2 size={11} /> Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToolShell>
  )
}
