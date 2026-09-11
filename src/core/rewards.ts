export type RewardKind = 'class_privilege' | 'experience' | 'family' | 'material' | 'recognition';

export interface RewardOption {
  id: string;
  title: string;
  kind: RewardKind;
  enabled: boolean;
  requiresAdultApproval: boolean;
}

export const DEFAULT_REWARD_BANK: RewardOption[] = [
  { id: 'class-leader', title: 'قائد الفصل لمدة محددة', kind: 'class_privilege', enabled: true, requiresAdultApproval: false },
  { id: 'choose-helper', title: 'اختيار زميل لنشاط مميز', kind: 'class_privilege', enabled: true, requiresAdultApproval: false },
  { id: 'school-walk', title: 'جولة قصيرة بإذن المعلم وفق أنظمة المدرسة', kind: 'experience', enabled: true, requiresAdultApproval: true },
  { id: 'family-outing', title: 'نشاط ترفيهي مع الأسرة', kind: 'family', enabled: true, requiresAdultApproval: true },
  { id: 'family-gift', title: 'جائزة تختارها الأسرة', kind: 'material', enabled: true, requiresAdultApproval: true },
  { id: 'achievement-certificate', title: 'شهادة إنجاز من شكابومبو', kind: 'recognition', enabled: true, requiresAdultApproval: false },
];

export const rewardUnlocked = (monthlyStars: number) => monthlyStars >= 30;
