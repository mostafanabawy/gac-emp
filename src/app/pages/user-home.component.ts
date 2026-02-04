import { Component, effect, signal } from '@angular/core';
import Swiper from 'swiper';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';

@Component({
  selector: 'app-user-home',
  templateUrl: './user-home.component.html'
})
export class UserHomeComponent {
  /* carousel */
  swiper1: any;
  swiper5: any;
  /* services */
  swiper6!: Swiper | null;
  swiper7!: Swiper | null;
  /* media */
  swiper8!: Swiper | null;
  swiper9!: Swiper | null;
  tab8 = signal<string>('youthcenters');
  tab5 = signal<string>('news');
  serviceItems = [{
    title: 'إنشاء مركز شبابي اهلي',
    icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/10/MSY-Icons-16.png',
    category: 'خدمات الشؤون الشبابية'
  },
  {
    title: 'منح شهادة تأهيل مزاولة الأنشطة الشبابية',
    icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/10/MSY-Icons-15.png',
    category: 'خدمات الشؤون الشبابية'
  },
  {
    title: 'تصريح إقامة أنشطة وفعاليات شبابية لجهة خاصة ربحية',
    icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/10/MSY-Icons-14.png',
    category: 'خدمات الشؤون الشبابية'
  },
  {
    title: 'طلب تسجيل عضوية الاندية الرياضية',
    icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/10/MSY-Icons-04.png',
    category: 'خدمات الشؤون الشبابية'
  },
  {
    title: 'طلب تصريح فعالية رياضية',
    icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/10/MSY-Icons-03.png',
    category: 'خدمات الشؤون الشبابية'
  },
  {
    title: 'طلب ترخيص نشاط انشاء وتسجيل الهيئات الرياضية',
    icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/10/MSY-Icons-02.png',
    category: 'خدمات الشؤون الشبابية'
  },
  {
    title: 'طلب ترخيص نشاط مراكز تأهيل الكوادر الرياضية',
    icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/10/MSY-Icons-01.png',
    category: 'خدمات الشؤون الشبابية'
  },
  {
    title: 'طلب ترخيص نشاط تعهدات تنظيم الفعاليات الرياضية',
    icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/10/MSY-Icons-08.png',
    category: 'خدمات الشؤون الشبابية'
  }

  ];
  clubItems = [
    {
      title: 'اللجنة المنظمة لسباق الهجن',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/1.png',
      link: 'https://www.msy.gov.qa/centers/%d8%a7%d9%84%d9%84%d8%ac%d9%86%d8%a9-%d8%a7%d9%84%d9%85%d9%86%d8%b8%d9%85%d8%a9-%d9%84%d8%b3%d8%a8%d8%a7%d9%82-%d8%a7%d9%84%d9%87%d8%ac%d9%86/'
    },
    {
      title: 'النادي العربي الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/2.png',
      link: 'https://www.msy.gov.qa/centers/%d8%a7%d9%84%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%b9%d8%b1%d8%a8%d9%8a-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي الخور الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/3.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%ae%d9%88%d8%b1-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي الدوحة للرياضات البحرية',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/4.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%af%d9%88%d8%ad%d8%a9-%d9%84%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d8%a7%d8%aa-%d8%a7%d9%84%d8%a8%d8%ad%d8%b1%d9%8a%d8%a9/'
    },
    {
      title: 'نادي سباق الفروسية',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/5.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%b3%d8%a8%d8%a7%d9%82-%d8%a7%d9%84%d9%81%d8%b1%d9%88%d8%b3%d9%8a%d8%a9/'
    },
    {
      title: 'نادي السد الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/6.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%b3%d8%af-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي السيلية الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/7.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%b3%d9%8a%d9%84%d9%8a%d8%a9-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي الشحانية الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/8.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%b4%d8%ad%d8%a7%d9%86%d9%8a%d8%a9-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي الشمال الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/9.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%b4%d9%85%d8%a7%d9%84-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي الغرافة الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/10.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%ba%d8%b1%d8%a7%d9%81%d8%a9-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي الوكرة الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/11.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d9%88%d9%83%d8%b1%d8%a9-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي حلبة سلين (مواتر )',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/12.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%ad%d9%84%d8%a8%d8%a9-%d8%b3%d9%84%d9%8a%d9%86-%d9%85%d9%88%d8%a7%d8%aa%d8%b1/'
    },
    {
      title: 'نادي سباقات القدرة والتحمل',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/13.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%b3%d8%a8%d8%a7%d9%82%d8%a7%d8%aa-%d8%a7%d9%84%d9%82%d8%af%d8%b1%d8%a9-%d9%88%d8%a7%d9%84%d8%aa%d8%ad%d9%85%d9%84/'
    },
    {
      title: 'نادي قطر الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/14.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d9%82%d8%b7%d8%b1-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي قطر لمزاين الإبل',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/15.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d9%82%d8%b7%d8%b1-%d9%84%d9%85%d8%b2%d8%a7%d9%8a%d9%86-%d8%a7%d9%84%d8%a5%d8%a8%d9%84/'
    },
    {
      title: 'نادي مسيمير الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/16.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d9%85%d8%b3%d9%8a%d9%85%d9%8a%d8%b1-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي المرخية الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/17.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d9%85%d8%b1%d8%ae%d9%8a%d8%a9-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'النادي الأهلي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/18.png',
      link: 'https://www.msy.gov.qa/centers/%d8%a7%d9%84%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%a3%d9%87%d9%84%d9%8a/'
    },
    {
      title: 'نادي الخرطيات الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/19.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%ae%d8%b1%d8%b7%d9%8a%d8%a7%d8%aa-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي أم صلال الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/21.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a3%d9%85-%d8%b5%d9%84%d8%a7%d9%84-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي الريان الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/22.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d9%86-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
    {
      title: 'نادي معيذر الرياضي',
      icon: 'https://www.msy.gov.qa/wp-content/uploads/2022/07/23.png',
      link: 'https://www.msy.gov.qa/centers/%d9%86%d8%a7%d8%af%d9%8a-%d9%85%d8%b9%d9%8a%d8%b0%d8%b1-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a/'
    },
  ]
  youthCenterItems = [
    {
      "title": "مركز الدانه للفتيات",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG635e50c312d75.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=10"
    },
    {
      "title": "ملتقى فتيات الكعبان",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5dc2630aaf118.JPG",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=16"
    },
    {
      "title": "مركز شباب الجميلية",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5e37dc5f723d1.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=17"
    },
    {
      "title": "ملتقى فتيات الجميلية",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5e37e26a69efb.jpg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=23"
    },
    {
      "title": "مركز فتيات الدوحه",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5f61314592574.jpg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=32"
    },
    {
      "title": "النادي العلمي القطري",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5dc979529165f.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=33"
    },
    {
      "title": "بيوت الشباب القطرية",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5e37de70f029d.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=35"
    },
    {
      "title": "مركز أصدقاء البيئة",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5e37defe58446.jpg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=37"
    },
    {
      "title": "مركز الريادة للفتيات",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5e1dd58fc5f4b.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=92"
    },
    {
      "title": "مركز المجد للفتيات",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5ed7b792651aa.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=96"
    },
    {
      "title": "مركز فتيات الخور",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG628f2a14b0ecc.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d9%8a%d9%83%d8%a9/?intOrganizerId=98"
    },
    {
      "title": "مركز شباب الذخيرة",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG67d88bffa77cb.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d9%8a%d9%83%d8%a9/?intOrganizerId=100"
    },
    {
      "title": "مركز فتيات الوكرة",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5fa7f5a67d60b.jpg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d9%8a%d9%83%d8%a9/?intOrganizerId=111"
    },
    {
      "title": "مركز شباب الدوحة",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5e31bafbe2762.jpg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d9%8a%d9%83%d8%a9/?intOrganizerId=120"
    },
    {
      "title": "مركز شباب الكعبان",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG635e4f37480f5.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d9%8a%d9%83%d8%a9/?intOrganizerId=126"
    },
    {
      "title": "مركز قطر للدراجات الهوائية",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG5e3a6ee4c0427.jpg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d9%8a%d9%83%d8%a9/?intOrganizerId=128"
    },
    {
      "title": "طموح للتنمية المجتمعية",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG606f8f93b47ce.jpg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d9%85%d8%ac%d8%aa%d9%85%d8%b9%d9%8a%d8%a9/?intOrganizerId=136"
    },
    {
      "title": "مركز قطر للرياضات اللاسلكية",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG6295c1ccc8942.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a%d8%a9/?intOrganizerId=174"
    },
    {
      "title": "نادي الشمال الرياضي",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG60acb08f42439.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a%d8%a9/?intOrganizerId=197"
    },
    {
      "title": "نادي الغرافة الرياضي",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG62a24175c2b17.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a%d8%a9/?intOrganizerId=199"
    },
    {
      "title": "نادي الخور الرياضي",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG60c8d3a7d6f57.jpg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b1%d9%8a%d8%a6%d9%8a%d8%a9/?intOrganizerId=200"
    },
    {
      "title": "نادي العربي الرياضي",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG61a669cce415e.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d9%8a%d8%a9/?intOrganizerId=201"
    },
    {
      "title": "مجلس الشباب القطري",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG621fa7677e70e.png",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=203"
    },
    {
      "title": "مركز شباب برزان",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG65db5faa6037f.jpeg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=204"
    },
    {
      "title": "ملتقى فتيات سميسمه والظعاين",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG62931fe72276a.jpg",
      "link": "https://www.msy.gov.qa/%d8%aa%d9%81%d8%a7%d8%b5%d9%8a%d9%84-%d8%a7%d9%84%d9%85%d8%b1%d8%a7%d9%83%d8%b2-%d8%a7%d9%84%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9/?intOrganizerId=205"
    },
    {
      "title": "جمعية القناص القطرية",
      "icon": "https://www.shabablad3m.qa/organizer/resources/upload/icon/IMG62949c51e6e4d.jpg",
      "link": "N/A"
    }
  ]
  newsItems = [
    {
      "title": "صيف استثنائي ينطلق اليوم مع “الرياضة للجميع 2024”",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2024/07/الاتحاد-القطري-للرياضة-للجميع.png",
      "link": "https://www.msy.gov.qa/news/%d8%b5%d9%8a%d9%81-%d8%a7%d8%b3%d8%aa%d8%ab%d9%86%d8%a7%d8%a6%d9%8a-%d9%8a%d9%86%d8%b7%d9%84%d9%82-%d8%a7%d9%84%d9%8a%d9%88%d9%85-%d9%85%d8%b9-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d8%a9-%d9%84%d9%84/",
      "createdAt": "29 يونيو 2024"
    },
    {
      "title": "خلال حفل تخريج ملهم.. تكريم خاص لسعادة المهندس ياسر بن عبدالله الجمال",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2025/06/PHOTO-2025-02-10-14-50-57.jpg",
      "link": "https://www.msy.gov.qa/news/%d8%ae%d9%84%d8%a7%d9%84-%d8%ad%d9%81%d9%84-%d8%aa%d8%ae%d8%b1%d9%8a%d8%ac-%d9%85%d9%84%d9%87%d9%85-%d8%aa%d9%83%d8%b1%d9%8a%d9%85-%d8%ae%d8%a7%d8%b5-%d9%84%d8%b3%d8%b9%d8%a7%d8%af%d8%a9-%d8%a7/",
      "createdAt": "26 يونيو 2024"
    },
    {
      "title": "المنصوري يتوّج بلقب بطولة الرياضة للجميع للبولينج 2024",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2025/06/GuPLmp8WkAAACTy.jpeg",
      "link": "https://www.msy.gov.qa/news/%d8%a7%d9%84%d9%85%d9%86%d8%b5%d9%88%d8%b1%d9%8a-%d9%8a%d8%aa%d9%88%d9%91%d8%ac-%d8%a8%d9%84%d9%82%d8%a8-%d8%a8%d8%b7%d9%88%d9%84%d8%a9-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d8%a9-%d9%84%d9%84%d8%ac/",
      "createdAt": "26 يونيو 2024"
    },
    {
      "title": "إقبال لافت على تدريبات المواي تاي ضمن فعاليات صيف الرياضة للجميع",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2025/06/2B4A6F7E-58AB-4DC0-9746-28A76842E08A.jpeg",
      "link": "https://www.msy.gov.qa/news/%d8%a5%d9%82%d8%a8%d8%a7%d9%84-%d9%84%d8%a7%d9%81%d8%aa-%d8%b9%d9%84%d9%89-%d8%aa%d8%af%d8%b1%d9%8a%d8%a8%d8%a7%d8%aa-%d8%a7%d9%84%d9%85%d9%88%d8%a7%d9%8a-%d8%aa%d8%a7%d9%8a-%d8%b6%d9%85%d9%86-%d9%81/",
      "createdAt": "25 يونيو 2024"
    },
    {
      "title": "انطلاق برنامج تعليم السباحة الصيفي بتنظيم من “الرياضة للجميع”",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2025/06/qasportsforall-6.jpg",
      "link": "https://www.msy.gov.qa/news/%d8%a7%d9%86%d8%b7%d9%84%d8%a7%d9%82-%d8%a8%d8%b1%d9%86%d8%a7%d9%85%d8%ac-%d8%aa%d8%b9%d9%84%d9%8a%d9%85-%d8%a7%d9%84%d8%b3%d8%a8%d8%a7%d8%ad%d8%a9-%d8%a7%d9%84%d8%b5%d9%8a%d9%81%d9%8a-%d8%a8%d8%aa/",
      "createdAt": "24 يونيو 2024"
    },
    {
      "title": "برؤية شبابية ومسؤولية بيئية.. تدشين شعار مركز أصدقاء البيئة الجديد",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2025/06/20250623_1750636213-61.webp",
      "link": "https://www.msy.gov.qa/news/%d8%a8%d8%b1%d8%a4%d9%8a%d8%a9-%d8%b4%d8%a8%d8%a7%d8%a8%d9%8a%d8%a9-%d9%88%d9%85%d8%b3%d8%a4%d9%88%d9%84%d9%8a%d8%a9-%d8%a8%d9%8a%d8%a6%d9%8a%d8%a9-%d8%aa%d8%af%d8%b4%d9%8a%d9%86-%d8%b4%d8%b9%d8%a7/",
      "createdAt": "23 يونيو 2024"
    },
    {
      "title": "مركز قطر للبولينج يحتضن فعاليات بطولة الرياضة للجميع وسط إقبال كبير",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2025/06/20250622_1750546651-471.webp",
      "link": "https://www.msy.gov.qa/news/%d9%85%d8%b1%d9%83%d8%b2-%d9%82%d8%b7%d8%b1-%d9%84%d9%84%d8%a8%d9%88%d9%84%d9%8a%d9%86%d8%ac-%d9%8a%d8%ad%d8%aa%d8%b6%d9%86-%d9%81%d8%b9%d8%a7%d9%84%d9%8a%d8%a7%d8%aa-%d8%a8%d8%b7%d9%88%d9%84%d8%a9/",
      "createdAt": "22 يونيو 2024"
    },
    {
      "title": "بطولة شباب الخليج للقوس والسهم تنطلق في الدوحة تحت شعار “شباب خليجي مسؤول لمستقبل مستدام",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2025/06/IMG_4410-scaled.jpeg",
      "link": "https://www.msy.gov.qa/news/%d8%a8%d8%b7%d9%88%d9%84%d8%a9-%d8%b4%d8%a8%d8%a7%d8%a8-%d8%a7%d9%84%d8%ae%d9%84%d9%8a%d8%ac-%d9%84%d9%84%d9%82%d9%88%d8%b3-%d9%88%d8%a7%d9%84%d8%b3%d9%87%d9%85-%d8%aa%d9%86%d8%b7%d9%84%d9%82-%d9%81/",
      "createdAt": "20 يونيو 2024"
    },
    {
      "title": "الرياضة للجميع يكشف عن فعاليات صيف 2024",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2025/06/IMG_4367.jpeg",
      "link": "https://www.msy.gov.qa/news/%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d8%a9-%d9%84%d9%84%d8%ac%d9%85%d9%8a%d8%b9-%d9%8a%d9%83%d8%b4%d9%81-%d8%b9%d9%86-%d9%81%d8%b9%d8%a7%d9%84%d9%8a%d8%a7%d8%aa-%d8%b5%d9%8a%d9%81-2024/",
      "createdAt": "18 يونيو 2024"
    },
    {
      "title": "افتتاح بطولة الرياضة للجميع للياقة البدنية وسط مشاركة مجتمعية واسعة",
      "imageLink": "https://www.msy.gov.qa/wp-content/uploads/2025/06/20250615_1749950014-842.jpg",
      "link": "https://www.msy.gov.qa/news/%d8%a7%d9%81%d8%aa%d8%aa%d8%a7%d8%ad-%d8%a8%d8%b7%d9%88%d9%84%d8%a9-%d8%a7%d9%84%d8%b1%d9%8a%d8%a7%d8%b6%d8%a9-%d9%84%d9%84%d8%ac%d9%85%d9%8a%d8%b9-%d9%84%d9%84%d9%8a%d8%a7%d9%82%d8%a9-%d8%a7%d9%84/",
      "createdAt": "15 يونيو 2024"
    }
  ]
  eventItems = [
    
  ]
  constructor() {
    effect(() => {
      console.log('Tab8 changed:', this.tab8());
      this.tab8();
      switch (this.tab8()) {
        case 'clubs':
          if (this.swiper7) {
            this.swiper7.destroy(true, true);
            this.swiper7 = null;
          }
          setTimeout(() => {
            if (!this.swiper6) {
              this.initDynamicSwiper(6);
            }
          }, 0)
          break;
        case 'youthcenters':
          if (this.swiper6) {
            this.swiper6.destroy(true, true);
            this.swiper6 = null;
          }
          setTimeout(() => {
            if (!this.swiper7) {
              this.initDynamicSwiper(7);
            }
          }, 0)
          break;
      }
    })
    effect(() => {
      console.log('Tab5 changed:', this.tab5());
      this.tab5();
      switch (this.tab5()) {
        case 'news':
          if (this.swiper9) {
            this.swiper9.destroy(true, true);
            this.swiper9 = null;
          }
          setTimeout(() => {
            if (!this.swiper8) {
              this.initDynamicSwiper(8);
            }
          }, 0)
          break;
        case 'events':
          if (this.swiper8) {
            this.swiper8.destroy(true, true);
            this.swiper8 = null;
          }
          setTimeout(() => {
            if (!this.swiper8) {
              this.initDynamicSwiper(9);
            }
          }, 0)
          break;
      }
    })
  }
  ngAfterViewInit() {
    this.swiper1 = new Swiper('#slider1', {
      modules: [Navigation, Pagination],
      navigation: { nextEl: '.swiper-button-next-ex1', prevEl: '.swiper-button-prev-ex1' },
      pagination: {
        el: '#slider1 .swiper-pagination',
        type: 'bullets',
        clickable: true,
      },
    });
    this.swiper5 = new Swiper('#slider5', {
      modules: [Navigation, Pagination],
      navigation: { nextEl: '.swiper-button-next-ex5', prevEl: '.swiper-button-prev-ex5' },
      breakpoints: {
        1024: { slidesPerView: 3, spaceBetween: 30 },
        768: { slidesPerView: 2, spaceBetween: 40 },
        320: { slidesPerView: 1, spaceBetween: 20 },
      }
    });


  }
  initDynamicSwiper(chosen: number) {
    if (chosen === 6) {
      this.swiper6 = new Swiper('#slider6', {
        modules: [Navigation, Pagination],
        navigation: { nextEl: '.swiper-button-next-ex6', prevEl: '.swiper-button-prev-ex6' },
        breakpoints: {
          1024: { slidesPerView: 3, spaceBetween: 30 },
          768: { slidesPerView: 2, spaceBetween: 40 },
          320: { slidesPerView: 1, spaceBetween: 20 },
        },
        observer: true,
        observeParents: true,
      });
    }
    if (chosen === 7) {
      this.swiper7 = new Swiper('#slider7', {
        modules: [Navigation, Pagination],
        navigation: { nextEl: '.swiper-button-next-ex7', prevEl: '.swiper-button-prev-ex7' },
        breakpoints: {
          1024: { slidesPerView: 3, spaceBetween: 30 },
          768: { slidesPerView: 2, spaceBetween: 40 },
          320: { slidesPerView: 1, spaceBetween: 20 },
        },
        observer: true,
        observeParents: true,
      });
    }
    if (chosen === 8) {
      this.swiper8 = new Swiper('#slider8', {
        modules: [Navigation, Pagination],
        navigation: { nextEl: '.swiper-button-next-ex8', prevEl: '.swiper-button-prev-ex8' },
        breakpoints: {
          1024: { slidesPerView: 2, spaceBetween: 30 },
          768: { slidesPerView: 2, spaceBetween: 40 },
          320: { slidesPerView: 1, spaceBetween: 20 },
        },
        autoHeight: true
      });
    }

  }
  ngOnDestroy(): void {
    // Destroy all swiper instances when the component is destroyed
    if (this.swiper1) this.swiper1.destroy(true, true);
    if (this.swiper5) this.swiper5.destroy(true, true);
    if (this.swiper6) this.swiper6.destroy(true, true);
    if (this.swiper7) this.swiper7.destroy(true, true);
    if (this.swiper8) this.swiper8.destroy(true, true);
    if (this.swiper9) this.swiper9.destroy(true, true);
  }
}
