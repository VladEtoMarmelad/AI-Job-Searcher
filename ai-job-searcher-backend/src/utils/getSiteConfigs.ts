import { SiteConfig } from "src/types/SiteConfig";

export const getSiteConfigs = (keyword: string) => {
  const siteConfigs: Record<string, SiteConfig> = {
    'robota.ua': {
      url: `https://robota.ua/zapros/${encodeURIComponent(keyword)}/ukraine`,
      linkSelector: 'alliance-vacancy-card-desktop a',
    },
    'dou.ua': {
      url: `https://jobs.dou.ua/vacancies/?search=${encodeURIComponent(keyword)}`,
      linkSelector: 'a.vt',
      nextBtn: '.more-btn a'
    },
    'djinni.co': {
      url: `https://djinni.co/jobs/?all_keywords=${encodeURIComponent(keyword)}`,
      linkSelector: 'a.job-item__title-link',
      nextBtn: '.pagination li:last-child a'
    }
  }

  return siteConfigs;
};