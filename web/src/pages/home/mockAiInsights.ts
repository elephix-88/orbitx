// HOME-AI-API-TODO: swap to real endpoint when the anomaly + LLM service ships.
// Until then this returns null so the card renders its empty state rather than
// fake copy.

export interface AiInsight {
 id: string;
 headline: string;
 body: string;
 category: 'Opportunity' | 'Anomaly' | 'Trend';
 primaryActionLabel: string;
 dismissLabel: string;
}

export async function fetchAiInsight(): Promise<AiInsight | null> {
 return Promise.resolve(null);
}
