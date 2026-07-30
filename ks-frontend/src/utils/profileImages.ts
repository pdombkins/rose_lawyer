// Centralized profile image mapping
import aishaRahmanHeadshot from "@/assets/staff/aisha-rahman-headshot.jpg";
import danielParkHeadshot from "@/assets/staff/daniel-park-headshot.jpg";
import davidOconnellHeadshot from "@/assets/staff/david-oconnell-headshot.jpg";
import jamesBentleyHeadshot from "@/assets/staff/james-bentley-headshot.jpg";
import lilyChenHeadshot from "@/assets/staff/lily-chen-headshot.jpg";
import miaRossiHeadshot from "@/assets/staff/mia-rossi-headshot.jpg";
import priyaIyerHeadshot from "@/assets/staff/priya-iyer-headshot.jpg";
import tomNguyenHeadshot from "@/assets/staff/tom-nguyen-headshot.jpg";

export const profileImages: Record<string, string> = {
  'Aisha Rahman': aishaRahmanHeadshot,
  'Daniel Park': danielParkHeadshot,
  'David O\'Connell': davidOconnellHeadshot,
  'James Bentley': jamesBentleyHeadshot,
  'Lily Chen': lilyChenHeadshot,
  'Mia Rossi': miaRossiHeadshot,
  'Priya Iyer': priyaIyerHeadshot,
  'Tom Nguyen': tomNguyenHeadshot
};

export const getProfileImage = (name: string): string => {
  return profileImages[name] || '';
};