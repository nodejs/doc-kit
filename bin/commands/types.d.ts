/**
 * Represents a command-line option for the CLI.
 */
export interface Option {
  flags: string[];
  desc: string;
  prompt?: {
    type: 'text' | 'confirm' | 'select' | 'multiselect';
    message: string;
    variadic?: boolean;
    required?: boolean;
    initialValue?: boolean;
    options?: { label: string; value: string }[];
  };
}

/**
 * Represents a command-line subcommand
 */
export interface Command {
  options: { [key: string]: Option };
  name: string;
  description: string;
  action: Function;
}
