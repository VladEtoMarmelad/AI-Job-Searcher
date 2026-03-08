import { SiteConfig } from "src/types/SiteConfig";

export const getBaseSiteConfigs = (keyword: string): Record<string, SiteConfig> => {
  const encoded = encodeURIComponent(keyword);
  
  return {
    'robota.ua': {
      url: `https://robota.ua/zapros/${encoded}/ukraine`,
      linkSelector: 'alliance-jobseeker-desktop-vacancies-list alliance-vacancy-card-desktop a',
    },
    'dou.ua': {
      url: `https://jobs.dou.ua/vacancies/?search=${encoded}`,
      linkSelector: 'a.vt',
      nextBtn: '.more-btn a'
    },
    'djinni.co': {
      url: `https://djinni.co/jobs/?all_keywords=${encoded}`,
      linkSelector: '.job-item a.job_item__header-link',
      nextBtn: '.pagination li:last-child a'
    }
  };
};