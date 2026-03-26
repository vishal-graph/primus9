
import { mapIntentToDesignIntent } from '../src/design-engine/moodboard/intentMapper';
import { buildMoodboardPrompt } from '../src/design-engine/moodboard/buildPrompt';
import * as fs from 'fs';

const roomContext = {
  roomId: 'room-1',
  roomName: 'Main Bathroom',
  roomType: 'BATHROOM'
};

const budgets = ['budget', 'moderate', 'premium'];
let results = '';

budgets.forEach(b => {
  const payload: any = {
    budgetRange: b,
    interiorStyles: ['indian-traditional'],
    mood: 'warm-cozy'
  };

  const intent = mapIntentToDesignIntent(payload, roomContext);
  const prompt = buildMoodboardPrompt(intent);

  results += `--- BUDGET: ${b} ---\n`;
  results += `Intent Object: ${JSON.stringify(intent, null, 2)}\n`;
  results += `Contains NO BATHTUBS: ${prompt.includes('STRICTLY NO BATHTUBS')}\n`;
  results += `Contains BATHTUB PERMITTED: ${prompt.includes('bathtub permitted')}\n`;
  results += `Tropical Climate Rule: ${prompt.match(/2\. TROPICAL CLIMATE: .*/)?.[0]}\n`;
  results += `\n`;
});

fs.writeFileSync('verification_results.txt', results);
console.log('Results written to verification_results.txt');
