/* Micah Miner's five media environments. Scenarios are fictional teaching examples. */
(function (root) {
  'use strict';
  const stages = [
    {
      name: 'Primary orality', place: 'The circle of voices', author: 'Walter Ong', color: '#ffc078', dark: '#493c36', floor: '#292a27', sky: '#101c25', symbol: 'voice',
      idea: 'Without writing, knowledge lives in shared memory, formula, rhythm, and performance.',
      mission: 'Carry a message through the circle. Pulse the three voices in the remembered order.',
      instruction: 'Remember the refrain: RIVER → SEED → FIRE. Then pulse those voices in that order. Replay the refrain whenever you need it.',
      nodes: [
        { label: 'SEED', text: 'A repeated phrase holds the planting knowledge in a form the community can recall.' },
        { label: 'FIRE', text: 'Retelling around the gathering place renews knowledge through participation.' },
        { label: 'RIVER', text: 'A familiar rhythm ties the message to an event and place in shared experience.' }
      ],
      question: 'What kept this message available to the community?',
      answers: ['A permanent record outside the speakers', 'Repeated performance and shared memory', 'An algorithm choosing what to amplify'], correct: 1,
      feedback: 'Repetition and communal performance support recall. A short game sequence illustrates one feature; it cannot reproduce the richness of an oral culture.',
      retry: 'Look at what you actually did: you carried a patterned message through memory and repetition.',
      takeaway: 'Knowledge is sustained through human memory and performance.'
    },
    {
      name: 'Literacy', place: 'The archive of traces', author: 'Walter Ong', color: '#ead9a4', dark: '#3c4448', floor: '#222d35', sky: '#111c2e', symbol: 'page',
      idea: 'Writing and print make language persistent and revisitable, supporting comparison, abstraction, and sustained argument.',
      mission: 'Recover three written traces. Compare their claims to reconstruct what happened at the bridge.',
      instruction: 'Pulse each archive. Its text stays in your field notes so you can revisit and compare it.',
      nodes: [
        { label: 'NOTICE', text: 'Council notice, Monday: “The bridge will close on Thursday for repairs.”' },
        { label: 'LOG', text: 'Repair log, Wednesday: “Flood damage forced an early closure today.”' },
        { label: 'LETTER', text: 'Resident letter, Friday: “I found the crossing blocked on Wednesday.”' }
      ],
      question: 'Which account fits the records you can revisit?',
      answers: ['The planned Thursday closure moved to Wednesday', 'The bridge remained open until Friday', 'A written notice guarantees the plan happened'], correct: 0,
      feedback: 'The stable traces let you compare a plan with later accounts. Writing makes scrutiny possible; it does not make every written claim true.',
      retry: 'Distinguish the planned date in the notice from the reported closure in the log and letter.',
      takeaway: 'A persistent text can be revisited, compared, and questioned.'
    },
    {
      name: 'Secondary orality', place: 'The broadcast chamber', author: 'Walter Ong', color: '#87ddec', dark: '#304455', floor: '#1d2a36', sky: '#101a29', symbol: 'signal',
      idea: 'Electronic media renew oral immediacy and shared audiences while depending on writing, print, and technical systems.',
      mission: 'Trace a radio message from script to microphone to audience.',
      instruction: 'Pulse the three relay stations. Listen if sound is on, or read the full captions in your notes.',
      nodes: [
        { label: 'SCRIPT', text: 'A human producer writes the bulletin: “The repaired bridge reopens at noon.”' },
        { label: 'MIC', text: 'A human announcer reads the bulletin aloud into an electronic microphone.' },
        { label: 'AUDIENCE', text: 'Households across the district hear the same broadcast together, away from its speaker.' }
      ],
      question: 'Why is this secondary orality?',
      answers: ['The audience lives in a culture with no writing', 'Software originated the bulletin itself', 'Electronic speech builds on a literate infrastructure'], correct: 2,
      feedback: 'The spoken event feels immediate and shared, yet relies on scripts and electronic infrastructure. Human beings still compose and perform the bulletin.',
      retry: 'Follow the chain: a written script supports an electronically transmitted human voice.',
      takeaway: 'Electronic speech creates new forms of shared presence on a literate base.'
    },
    {
      name: 'Algorithmic secondary orality', place: 'The attention engine', author: 'Micah Miner · proposed extension', color: '#cea7ff', dark: '#403751', floor: '#282335', sky: '#181326', symbol: 'feed',
      idea: 'Humans create the content; algorithms curate, rank, and amplify its circulation.',
      mission: 'Investigate a ranked feed. Change its ranking rule to recover a voice that engagement ranking leaves out.',
      instruction: 'Scan the two visible posts, then select “Change ranking.” Compare the newly visible post with the popular claims.',
      nodes: [
        { label: 'VIRAL', text: 'Human post · 9,200 reactions: “The new bridge works perfectly for absolutely everyone!”' },
        { label: 'TREND', text: 'Human post · 6,100 reactions: “The opening celebration looked amazing.”' },
        { label: 'LOCAL', text: 'Human post · 18 reactions: “The ramp is still closed. I cannot cross with my wheelchair.”' }
      ],
      question: 'What did changing the ranking rule reveal?',
      answers: ['The algorithm authored all three posts', 'Ranking shaped whose human-created account became visible', 'The most popular claim was automatically the most accurate'], correct: 1,
      feedback: 'The authors did not change. The selection rule changed whose account you encountered. Engagement and relevance produce different views of the same human-created material.',
      retry: 'Separate authorship from circulation: the people wrote the posts; the ranking system selected their visibility.',
      takeaway: 'Algorithmic selection shapes visibility while authorship remains human.'
    },
    {
      name: 'Tertiary algorithmicity', place: 'The synthesis reactor', author: 'Micah Miner · proposed extension', color: '#92efc3', dark: '#294747', floor: '#1b3031', sky: '#102528', symbol: 'core',
      idea: 'Algorithmic systems both curate and generate symbolic content, making human authorship optional at scale.',
      mission: 'Audit a fluent generated briefing. Keep responsibility for what you decide and communicate.',
      instruction: 'Scan the generated briefing and both records. Decide which revision you can support with evidence.',
      nodes: [
        { label: 'AI DRAFT', text: 'Simulated generated briefing: “The bridge is fully accessible. Every resident can now cross safely.” No supporting references are supplied.' },
        { label: 'RECORD A', text: 'Inspection record: the main deck is open. The accessible ramp remains closed pending repairs.' },
        { label: 'RECORD B', text: 'Community account: some residents still need an accessible alternative route.' }
      ],
      question: 'Which briefing would you take responsibility for?',
      answers: ['The deck is open; the ramp is closed, so accessible crossing remains unresolved', 'The polished AI draft proves the bridge works for everyone', 'All AI assistance must always be rejected'], correct: 0,
      feedback: 'You compared evidence, revised the claim, and retained responsibility. In Miner’s framework, this illustrates noetic, rhetorical, and existential friction. Access, time, and support condition whether that work is possible.',
      retry: 'Keep the useful fact that the deck is open, correct the unsupported accessibility claim, and retain human judgment.',
      takeaway: 'Generation changes authorship; learners can still verify, revise, and take responsibility.'
    }
  ];

  function createSession() {
    return {
      stage: 0, found: [], echo: 0, ranked: false, solved: false, complete: false, attempts: 0, reflections: [],
      scan(id) {
        if (this.complete || id < 0 || id > 2) return { kind: 'blocked' };
        if (this.stage === 3 && id === 2 && !this.ranked) return { kind: 'blocked' };
        if (this.stage === 0 && !this.found.includes(id)) {
          if ([2, 0, 1][this.echo] !== id) { this.echo = 0; this.found = []; return { kind: 'retry' }; }
          this.echo++;
        }
        const fresh = !this.found.includes(id);
        if (fresh) this.found.push(id);
        return { kind: fresh ? 'found' : 'review', text: stages[this.stage].nodes[id].text };
      },
      changeRanking() { if (this.stage === 3 && this.found.includes(0) && this.found.includes(1)) this.ranked = true; return this.ranked; },
      answer(index) {
        if (this.complete || this.found.length !== 3 || this.solved) return false;
        this.attempts++;
        this.solved = index === stages[this.stage].correct;
        return this.solved;
      },
      advance() {
        if (!this.solved || this.complete) return false;
        this.reflections.push(stages[this.stage].takeaway);
        if (this.stage === stages.length - 1) { this.complete = true; return true; }
        this.stage++; this.found = []; this.echo = 0; this.ranked = false; this.solved = false;
        return true;
      }
    };
  }
  const api = { stages, createSession };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OngWorld = api;
})(typeof window !== 'undefined' ? window : this);
