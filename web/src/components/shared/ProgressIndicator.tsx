import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  steps: number;
  currentStep: number;
  stepLabels?: string[];
  className?: string;
  variant?: 'dots' | 'line' | 'numbered';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  stepLabels,
  className,
  variant = 'dots',
}) => {
  const stepArray = Array.from({ length: steps }, (_, i) => i + 1);

  if (variant === 'line') {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between mb-2">
          {stepLabels?.map((label, index) => (
            <span
              key={index}
              className={cn(
                'text-sm font-medium',
                index + 1 <= currentStep ? 'text-primary-400' : 'text-text-tertiary'
              )}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="w-full bg-neutral-800 rounded-full h-2">
          <div
            className="bg-primary-400 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / steps) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'numbered') {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        {stepArray.map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200',
                  step < currentStep
                    ? 'bg-primary-400 text-neutral-950'
                    : step === currentStep
                    ? 'bg-primary-400 text-neutral-950 ring-4 ring-primary-400/20'
                    : 'bg-neutral-800 text-text-tertiary'
                )}
              >
                {step < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step
                )}
              </div>
              {stepLabels?.[index] && (
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    step <= currentStep ? 'text-primary-400' : 'text-text-tertiary'
                  )}
                >
                  {stepLabels[index]}
                </span>
              )}
            </div>
            {index < stepArray.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4 transition-all duration-300',
                  step < currentStep ? 'bg-primary-400' : 'bg-neutral-800'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Default: dots variant
  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      {stepArray.map((step) => (
        <div
          key={step}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-200',
            step <= currentStep
              ? 'bg-primary-400 scale-125'
              : 'bg-neutral-700'
          )}
        />
      ))}
    </div>
  );
};

// Pre-built progress indicators for common use cases
export const FormStepIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}> = ({ currentStep, totalSteps, stepLabels }) => (
  <ProgressIndicator
    steps={totalSteps}
    currentStep={currentStep}
    stepLabels={stepLabels}
    variant="numbered"
    className="mb-8"
  />
);

export const LoadingProgress: React.FC<{
  progress: number; // 0-100
  label?: string;
}> = ({ progress, label }) => (
  <div className="w-full">
    {label && (
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="text-sm text-text-secondary">{Math.round(progress)}%</span>
      </div>
    )}
    <div className="w-full bg-neutral-800 rounded-full h-2">
      <div
        className="bg-primary-400 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  </div>
);
