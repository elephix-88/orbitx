import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Link2,
  Workflow,
  Play,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';

interface WelcomeModalProps {
  onComplete: () => void;
  onDismiss: () => void;
  userName?: string;
}

interface OnboardingStep {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  route?: string;
  iconBg: string;
  iconColor: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'connections',
    icon: Link2,
    title: 'Connect Your Data Sources',
    description:
      'Link your ad platforms like Facebook Ads or Google Ads. This is required before creating workflows.',
    action: 'Set Up Connections',
    route: '/connections',
    iconBg: 'bg-blue-900/20',
    iconColor: 'text-blue-400',
  },
  {
    id: 'workflow',
    icon: Workflow,
    title: 'Create Your First Workflow',
    description:
      'Build a visual pipeline to extract, transform, and load your marketing data automatically.',
    action: 'Create Workflow',
    route: '/workflows',
    iconBg: 'bg-violet-900/20',
    iconColor: 'text-violet-400',
  },
  {
    id: 'execute',
    icon: Play,
    title: 'Execute & Monitor',
    description:
      'Run your workflows on a schedule and monitor execution status from the dashboard.',
    action: 'View Dashboard',
    route: '/dashboard',
    iconBg: 'bg-emerald-900/20',
    iconColor: 'text-emerald-400',
  },
];

/**
 * Welcome modal - shadcn/ui style
 */
export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  onComplete,
  onDismiss,
  userName,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const handleStepAction = (step: OnboardingStep) => {
    if (step.route) {
      onComplete();
      navigate(step.route);
    }
  };

  const handleNext = useCallback(() => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = () => {
    onDismiss();
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'Escape':
          handleSkip();
          break;
      }
    },
    [handleNext, handlePrevious]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const step = ONBOARDING_STEPS[currentStep];
  const StepIcon = step.icon;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/80"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className={cn(
        "relative z-50 w-full max-w-lg",
        "bg-surface-primary",
        "rounded-lg shadow-lg",
        "border border-border",
        "overflow-hidden"
      )}>
        {/* Header with brand color */}
        <div className="relative bg-primary-400 px-6 py-8 text-neutral-950">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 text-sm font-medium text-neutral-950/70">
            <Sparkles className="h-4 w-4" />
            <span>Welcome to OrbitX</span>
          </div>
          <h2 id="welcome-title" className="mt-2 text-2xl font-semibold">
            {userName ? `Hey ${userName}!` : 'Welcome!'} Let's get started
          </h2>
          <p className="mt-1 text-sm text-neutral-950/60">
            Set up your marketing data automation in 3 simple steps.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center -mt-4 relative z-10">
          <div className="flex items-center gap-2 rounded-full bg-surface-primary px-3 py-2 shadow-lg border border-border">
            {ONBOARDING_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Step ${idx + 1}: ${s.title}`}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
                  idx === currentStep && "bg-primary-400 text-neutral-950",
                  idx < currentStep && "bg-emerald-500 text-white",
                  idx > currentStep && "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary"
                )}
              >
                {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step icon */}
          <div className="flex justify-center">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              step.iconBg
            )}>
              <StepIcon className={cn("h-6 w-6", step.iconColor)} />
            </div>
          </div>

          {/* Step content */}
          <div className="mt-4 text-center">
            <h3 className="text-lg font-semibold text-text-primary">
              Step {currentStep + 1}: {step.title}
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              {step.description}
            </p>
          </div>

          {/* Action button */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              onClick={() => handleStepAction(step)}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {step.action}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div>
            {currentStep > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
            ) : (
              <button
                onClick={handleSkip}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Skip
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-text-tertiary sm:inline">
              ← → to navigate
            </span>
            <Button variant="ghost" size="sm" onClick={handleNext}>
              {currentStep < ONBOARDING_STEPS.length - 1 ? 'Next' : 'Done'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

/**
 * Compact onboarding checklist for dashboard sidebar
 */
export const OnboardingChecklist: React.FC<{
  hasConnections: boolean;
  hasWorkflows: boolean;
  hasExecutions: boolean;
  onDismiss: () => void;
}> = ({ hasConnections, hasWorkflows, hasExecutions, onDismiss }) => {
  const navigate = useNavigate();
  const completedCount = [hasConnections, hasWorkflows, hasExecutions].filter(Boolean).length;

  if (completedCount === 3) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-border bg-surface-primary shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            Getting Started
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">{completedCount}/3</span>
            <button
              onClick={onDismiss}
              className="rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <ChecklistItem
            completed={hasConnections}
            label="Set up a connection"
            onClick={() => navigate('/connections')}
          />
          <ChecklistItem
            completed={hasWorkflows}
            label="Create your first workflow"
            onClick={() => navigate('/workflows')}
          />
          <ChecklistItem
            completed={hasExecutions}
            label="Run a workflow"
            disabled={!hasWorkflows}
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-surface-secondary">
        <div
          className="h-full bg-primary-400 transition-all duration-500"
          style={{ width: `${(completedCount / 3) * 100}%` }}
        />
      </div>
    </div>
  );
};

const ChecklistItem: React.FC<{
  completed: boolean;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ completed, label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled || completed}
    className={cn(
      'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors',
      completed && 'bg-emerald-900/10',
      !completed && !disabled && 'hover:bg-surface-secondary',
      disabled && 'cursor-not-allowed opacity-50'
    )}
  >
    <div
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
        completed
          ? 'bg-emerald-500 text-white'
          : 'border-2 border-border'
      )}
    >
      {completed && <Check className="h-3 w-3" />}
    </div>
    <span
      className={cn(
        'text-sm',
        completed
          ? 'text-emerald-400 line-through'
          : 'text-text-secondary'
      )}
    >
      {label}
    </span>
  </button>
);
