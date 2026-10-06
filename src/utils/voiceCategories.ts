export type VoiceGender = 'male' | 'female' | 'neutral';
export type VoiceAge = 'young' | 'adult' | 'mature';
export type VoiceAccent = 
  | 'american'
  | 'british'
  | 'australian'
  | 'canadian'
  | 'african'
  | 'nigerian'
  | 'kenyan'
  | 'south-african'
  | 'french'
  | 'canadian-french'
  | 'spanish'
  | 'portuguese'
  | 'swahili'
  | 'other';

export type VoiceStyle = 'calm' | 'deep' | 'warm' | 'narrator';

export interface VoiceCategory {
  gender: VoiceGender;
  age: VoiceAge;
  accent: VoiceAccent;
  style?: VoiceStyle;
}

export function categorizeVoice(voiceName: string, voiceLang: string): VoiceCategory {
  const name = voiceName.toLowerCase();
  const lang = voiceLang.toLowerCase();

  // Gender detection
  let gender: VoiceGender = 'neutral';
  if (name.includes('female') || name.includes('woman') || name.includes('samantha') || name.includes('victoria') || name.includes('karen') || name.includes('tessa')) {
    gender = 'female';
  } else if (name.includes('male') || name.includes('man') || name.includes('daniel') || name.includes('alex') || name.includes('thomas') || name.includes('david')) {
    gender = 'male';
  }

  // Age detection
  let age: VoiceAge = 'adult';
  if (name.includes('young') || name.includes('junior')) {
    age = 'young';
  } else if (name.includes('mature') || name.includes('senior') || name.includes('elder')) {
    age = 'mature';
  }

  // Accent detection
  let accent: VoiceAccent = 'other';
  if (lang.includes('en-us') || lang.includes('en-us') || name.includes('american') || name.includes('us')) {
    accent = 'american';
  } else if (lang.includes('en-gb') || lang.includes('en-uk') || name.includes('british') || name.includes('uk') || name.includes('english')) {
    accent = 'british';
  } else if (lang.includes('en-au') || name.includes('australian') || name.includes('australia')) {
    accent = 'australian';
  } else if (lang.includes('en-ca') || name.includes('canadian') || name.includes('canada')) {
    accent = 'canadian';
  } else if (lang.includes('fr-fr') || name.includes('french') || name.includes('france')) {
    accent = 'french';
  } else if (lang.includes('fr-ca') || name.includes('canadian french') || name.includes('québécois')) {
    accent = 'canadian-french';
  } else if (lang.includes('es') || name.includes('spanish') || name.includes('español')) {
    accent = 'spanish';
  } else if (lang.includes('pt') || name.includes('portuguese') || name.includes('português')) {
    accent = 'portuguese';
  } else if (lang.includes('sw') || name.includes('swahili') || name.includes('kiswahili')) {
    accent = 'swahili';
  } else if (name.includes('nigerian') || name.includes('nigeria')) {
    accent = 'nigerian';
  } else if (name.includes('kenyan') || name.includes('kenya')) {
    accent = 'kenyan';
  } else if (name.includes('south african') || name.includes('south africa')) {
    accent = 'south-african';
  } else if (name.includes('african')) {
    accent = 'african';
  }

  // Style detection
  let style: VoiceStyle | undefined;
  if (name.includes('calm') || name.includes('peaceful') || name.includes('serene')) {
    style = 'calm';
  } else if (name.includes('deep') || name.includes('bass') || name.includes('low')) {
    style = 'deep';
  } else if (name.includes('warm') || name.includes('friendly') || name.includes('gentle')) {
    style = 'warm';
  } else if (name.includes('narrator') || name.includes('storyteller') || name.includes('reader')) {
    style = 'narrator';
  }

  return { gender, age, accent, style };
}

export function getAccentLabel(accent: VoiceAccent): string {
  const labels: Record<VoiceAccent, string> = {
    'american': 'American English',
    'british': 'British English',
    'australian': 'Australian English',
    'canadian': 'Canadian English',
    'african': 'African English',
    'nigerian': 'Nigerian English',
    'kenyan': 'Kenyan English',
    'south-african': 'South African English',
    'french': 'French',
    'canadian-french': 'Canadian French',
    'spanish': 'Spanish',
    'portuguese': 'Portuguese',
    'swahili': 'Swahili',
    'other': 'Other',
  };
  return labels[accent] || accent;
}

export function getGenderLabel(gender: VoiceGender): string {
  const labels: Record<VoiceGender, string> = {
    'male': 'Male',
    'female': 'Female',
    'neutral': 'Neutral',
  };
  return labels[gender] || gender;
}

export function getAgeLabel(age: VoiceAge): string {
  const labels: Record<VoiceAge, string> = {
    'young': 'Young Adult',
    'adult': 'Adult',
    'mature': 'Mature',
  };
  return labels[age] || age;
}

export function getStyleLabel(style: VoiceStyle): string {
  const labels: Record<VoiceStyle, string> = {
    'calm': 'Calm',
    'deep': 'Deep',
    'warm': 'Warm',
    'narrator': 'Narrator',
  };
  return labels[style] || style;
}

export function suggestVoiceForTranslation(translation: string): VoiceAccent {
  const trans = translation.toLowerCase();
  if (trans.includes('kjv') || trans.includes('web') || trans.includes('asv')) {
    return 'american'; // American English translations
  } else if (trans.includes('bbe')) {
    return 'british'; // Bible in Basic English
  }
  return 'american'; // Default
}
