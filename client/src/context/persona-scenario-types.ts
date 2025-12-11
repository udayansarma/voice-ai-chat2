// Types for Persona and Scenario
export interface Persona {
  id: string;
  name: string;
  demographics?: {
    ageGroup?: string;
    role?: string;
  };
  behavior?: string;
  needs?: string;
  painpoints?: string;
}

export interface Scenario {
  id: string;
  title: string;
  scenario: {
    description: string;
    context: {
      device?: string;
      service?: string;
      environment?: string;
      prior_actions?: string[];
      [key: string]: unknown;
    };
  };
  exit_criteria: {
    description: string;
    customer_exit_signals: string[];
  };
  evaluation_criteria: {
    identity_validation?: string[];
    troubleshooting_steps?: string[];
    resolution_confirmation?: string[];
    [key: string]: unknown;
  };
  scenario_type: string;
  difficulty_level?: string;
  expected_duration_seconds?: number;
  version?: string;
  [key: string]: unknown;
}
