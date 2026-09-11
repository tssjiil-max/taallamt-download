"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items=[{href:"/",label:"اليوم",icon:"⌂"},{href:"/teacher/students",label:"الطلاب",icon:"♟"},{href:"/teacher/library",label:"المكتبة",icon:"▤"},{href:"/teacher/settings",label:"المزيد",icon:"•••"}];
export function TeacherNav(){const pathname=usePathname();return <nav className="ta-nav" aria-label="التنقل الرئيسي">{items.map(item=>{const active=item.href==="/"?pathname==="/":pathname.startsWith(item.href);return <Link className={active?"active":""} href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span><b>{item.label}</b></Link>})}</nav>}
export function TeacherBackHeader({title,subtitle,icon="ت"}:{title:string;subtitle?:string;icon?:string}){return <header className="ta-inner-header"><Link href="/" className="ta-logo" aria-label="العودة إلى اليوم">{icon}</Link><div><small>تعلّمت · الصف الثاني / 4</small><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div><Link href="/" className="ta-back">الرئيسية</Link></header>}
