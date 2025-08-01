import { UserSettings, TadabburLevel } from '../types';
import { TADABBUR_LEVELS } from '../constants';

export const getPersonaInstruction = (userProfile: { gender: 'male' | 'female', age: string, roles: string[], country: string, roleOther?: string }, language: 'en' | 'ms'): string => {
    const langName = language === 'ms' ? "Malay" : "English";
    const rolesText = [...userProfile.roles, userProfile.roleOther || ''].filter(Boolean).join(', ');
    
    let personaParts = [];
    if (userProfile.age) personaParts.push(`a ${userProfile.age}-year-old`);
    if (userProfile.gender) personaParts.push(userProfile.gender);
    if (rolesText) personaParts.push(`who is a ${rolesText}`);
    if (userProfile.country) personaParts.push(`from ${userProfile.country}`);

    let persona = '';
    if (personaParts.length > 0) {
        persona = `The user is ${personaParts.join(', ')}.`;
    }

    return `Your responses must be in ${langName}. ${persona} Your tone should be gentle, empathetic, and wise, like a caring mentor.`;
};


export const getLevelPromptPart = (level: TadabburLevel): string => {
  const levelDetail = TADABBUR_LEVELS[level];
  if (!levelDetail) return 'a general reflection on the verse.';

  // A more robust way to generate the prompt part based on constants
  switch (level) {
    case TadabburLevel.L1:
      return 'a direct reflection on the single verse provided.';
    case TadabburLevel.L2:
      return 'a reflection on the verse in relation to its immediate context (the verses before and after it).';
    case TadabburLevel.L3:
      return `an analysis connecting the verse's message to the name of the Surah it belongs to.`;
    case TadabburLevel.L4:
      return `an explanation of how this verse contributes to the central theme of its Surah.`;
    case TadabburLevel.L5:
      return `an analysis of the verse in light of the Surah's opening and concluding themes.`;
    case TadabburLevel.L6:
      return 'an identification and analysis of a key Arabic word in the verse, tracing its usage and meaning elsewhere in the Quran.';
    case TadabburLevel.L7:
      return 'a deep dive into a core Islamic concept found in the verse, discussing it with reference to other relevant verses.';
    case TadabburLevel.L8:
      return 'a comprehensive, multi-layered analysis that includes context, themes, concepts, and must provide one authentic, relevant Hadith (including text, translation, and source).';
    default:
      return 'a general reflection on the verse.';
  }
};
