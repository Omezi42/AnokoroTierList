export const CARD_NAMES_URL = "https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/all_card_names.txt";
export const CROPPED_IMAGE_BASE_URL = "https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/cropped_cards";
export const TRANSPARENT_IMAGE_BASE_URL = "https://raw.githubusercontent.com/Omezi42/AnokoroImageFolder/main/images/transparent_cards";
export const IMAGE_SUFFIX = ".png";

export function getImagePath(name: string, type: 'background' | 'sub') {
  const encodedName = encodeURIComponent(name).replace(/\(/g, '%28').replace(/\)/g, '%29');
  const baseUrl = type === 'background' ? CROPPED_IMAGE_BASE_URL : TRANSPARENT_IMAGE_BASE_URL;
  return `${baseUrl}/${encodedName}${IMAGE_SUFFIX}`;
}

export async function fetchCardNames(): Promise<string[]> {
  try {
    const response = await fetch(CARD_NAMES_URL);
    if (!response.ok) throw new Error('Failed to fetch card names');
    const text = await response.text();
    return text.split('\n').filter(name => name.trim() !== '');
  } catch (error) {
    console.error('Error fetching card names:', error);
    return [];
  }
}
