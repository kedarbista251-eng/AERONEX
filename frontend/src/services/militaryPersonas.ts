import type { MilitaryPersona, MilitaryRole } from '../types';

export const MILITARY_PERSONAS: Record<MilitaryRole, MilitaryPersona> = {
  Commander: {
    id: 'Commander',
    name: 'Air Commodore A. Vance',
    rank: 'Air Commodore (AOC)',
    callsign: 'EAGLE-ACTUAL',
    roleTitle: 'Joint Force Air Component Commander',
    clearance: 'TOP SECRET // LEVEL-1',
    unit: 'Theater Joint Air Operations Center (JAOC)',
    authorityLevel: 'Sole ATO Release & In-Flight Retasking Veto Authority',
    primaryMission: 'Strategic Theater Command & Defensive Air Posture',
    activeDatalink: 'MIL-STD-188-220 Command Net (Crypto Encrypted)',
    avatarBg: 'from-rose-600 to-amber-700',
    unreadDispatches: 2,
    keyResponsibilities: [
      'Exercises non-bypassable Human-in-the-Loop veto authority over AI plans',
      'Authorizes emergency in-flight retasking and tactical threat evasions',
      'Signs and cryptographically releases daily Air Tasking Orders (ATO)',
      'Controls DEFCON readiness and strategic asset dispersal priorities',
    ],
  },
  Planner: {
    id: 'Planner',
    name: 'Wg Cdr R. Sharma',
    rank: 'Wing Commander',
    callsign: 'TACTIC-1',
    roleTitle: 'Chief Air Operations Planner',
    clearance: 'SECRET // C2 PLANNING',
    unit: 'Air Operations Planning Cell (AOPC)',
    authorityLevel: 'Scenario Authoring & Deterministic Solver Execution',
    primaryMission: '9-Rule Constraint Optimization & Pareto Balancing',
    activeDatalink: 'GCSS Tactical Planning Grid (High-Bandwidth)',
    avatarBg: 'from-cyan-600 to-blue-700',
    unreadDispatches: 4,
    keyResponsibilities: [
      'Executes 9-rule deterministic optimization across 7 live data feeds',
      'Resolves aircraft payload, crew rest fatigue, and fuel reserves',
      'Calculates Pareto trade-offs between flight time and threat exposure',
      'Prepares standardized Air Tasking Order (ATO) manifests for AOC review',
    ],
  },
  Pilot: {
    id: 'Pilot',
    name: 'Sqn Ldr K. Sen',
    rank: 'Squadron Leader',
    callsign: 'TIGER-LEAD',
    roleTitle: 'Strike Flight Lead (Viper-101)',
    clearance: 'SECRET // TACTICAL AIRCREW',
    unit: 'No. 17 Squadron (Golden Arrows) - Rafale F4',
    authorityLevel: 'Cockpit Flight Execution & Datalink Acknowledgment',
    primaryMission: 'Combat Air Patrol (CAP) & Ingress Precision Interdiction',
    activeDatalink: 'Link-16 / BNet UHF Secure Datalink (J-Series MFD)',
    avatarBg: 'from-emerald-600 to-teal-700',
    unreadDispatches: 1,
    keyResponsibilities: [
      'Receives real-time tactical retasking orders via Link-16 Cockpit HUD',
      'Inspects live SAM threat envelopes, radar evasion radials & waypoints',
      'Monitors strict Bingo fuel return-to-base threshold (1,850 kg)',
      'Submits cryptographically signed WILCO acknowledgment to Command',
    ],
  },
  Engineer: {
    id: 'Engineer',
    name: 'Sqn Ldr M. Rao',
    rank: 'Squadron Leader',
    callsign: 'FORGE-ACTUAL',
    roleTitle: 'Senior Technical Officer (Logistics & Hangars)',
    clearance: 'CONFIDENTIAL // DEPOT & LOGISTICS',
    unit: 'Base Engineering Wing, Sector-Alpha Hub',
    authorityLevel: 'Airframe Reliability, Weibull MTBF & Fuel Logistics',
    primaryMission: 'Fleet Serviceability & Quick-Turnaround Surge (SGR)',
    activeDatalink: 'AFMET Ground Fleet Telemetry Bus',
    avatarBg: 'from-amber-600 to-orange-700',
    unreadDispatches: 3,
    keyResponsibilities: [
      'Monitors Weibull MTBF component reliability and hydraulic wear',
      'Manages 6 airbase aviation turbine fuel (ATF) reserves (450 kL)',
      'Coordinates hangar bay turnaround times for continuous sortie surge',
      'Issues preventative maintenance holds for stressed combat airframes',
    ],
  },
};

export interface InformationRoutingNode {
  stage: string;
  stageNumber: number;
  actor: string;
  role: MilitaryRole;
  dataInput: string;
  transformationProcess: string;
  dataOutput: string;
  transmissionChannel: string;
  latency: string;
}

export const C2_INFORMATION_ROUTING_PIPELINE: InformationRoutingNode[] = [
  {
    stageNumber: 1,
    stage: 'Multi-Source Signal Ingestion',
    actor: 'AERONEX Fusion Engine',
    role: 'Planner',
    dataInput: '7 Disparate Feeds (Airframe telemetry, Crew rest, Weapon bays, Airspace NOTAMs, Doppler radar, Threat emitters, C2 priorities)',
    transformationProcess: 'Normalizes asynchronous schemas, validates sensor timestamps, filters spoofed tracks, and correlates multi-spectral radar contacts into a single Common Operational Picture (COP).',
    dataOutput: 'Unified 4D Theater Grid & Integrity Score (99.4%)',
    transmissionChannel: 'ZeroMQ High-Speed Telemetry Bus',
    latency: '< 180 ms',
  },
  {
    stageNumber: 2,
    stage: 'Deterministic Optimization & Scenario Planning',
    actor: 'Wg Cdr Sharma (Ops Planner)',
    role: 'Planner',
    dataInput: 'Infeasible mission requests, target coordinates, available airbases',
    transformationProcess: 'Evaluates 9 non-negotiable hard rules (fuel margins, crew fatigue, weapon compatibility, SAM evasion). Solves Pareto frontier between survivability and mission duration.',
    dataOutput: 'Validated Scenario Plan & Draft Air Tasking Order (ATO)',
    transmissionChannel: 'C2 Tactical Planning Bus',
    latency: '< 2.8 s',
  },
  {
    stageNumber: 3,
    stage: 'Human-in-the-Loop Veto & Strategic Authorization',
    actor: 'Air Commodore Vance (Commander)',
    role: 'Commander',
    dataInput: 'Optimized Retask Plan + Explainable AI (XAI) Rule Proofs + Survivability Delta (+14.2%)',
    transformationProcess: 'Commander evaluates legal rules of engagement (ROE), reviews survivability impact, and issues digitally signed approval or manual override with constitutional chain-of-command accountability.',
    dataOutput: 'Officially Signed ATO Release & Authorized Retask Order',
    transmissionChannel: 'Secure Cryptographic C2 Network',
    latency: 'Immediate',
  },
  {
    stageNumber: 4,
    stage: 'Tactical Cockpit Datalink Transmission',
    actor: 'Sqn Ldr Sen (Flight Lead / Pilot)',
    role: 'Pilot',
    dataInput: 'Approved In-Flight Retasking Order (Target coordinates, Egress vector, Threat avoidance corridor)',
    transformationProcess: 'Transforms strategic C2 decision into standard Link-16 J-Series tactical messages (J2.2 / J3.5). Injects updated steerpoints, threat domes, and Bingo fuel lines directly onto Cockpit MFD displays without radio chatter.',
    dataOutput: 'Cockpit MFD Waypoint Ingress + Pilot WILCO Acknowledgment',
    transmissionChannel: 'Link-16 / BNet UHF Encrypted Tactical Datalink',
    latency: '< 120 ms',
  },
  {
    stageNumber: 5,
    stage: 'Reliability & Logistics Work Order Routing',
    actor: 'Sqn Ldr Rao (Technical Officer)',
    role: 'Engineer',
    dataInput: 'Airframe flight hours, engine thermal cycles, ordnance release counts',
    transformationProcess: 'Transforms sortie execution metrics into Weibull MTBF component wear predictions. Flags hydraulic seal maintenance at 38 operating hours and dispatches fuel bowsers and re-arming crews for rapid sortie surge (SGR).',
    dataOutput: 'Predictive Work Orders, Hangar Bay Prep & Fuel Logistics Manifest',
    transmissionChannel: 'Base Automated Logistics Network (AFMET)',
    latency: 'Real-time telemetry stream',
  },
];
