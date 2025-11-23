import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditModelDialog from '../EditModelDialog';
import {
  mockModel,
  mockModelMinimal,
  mockAnthropicModel,
  mockGoogleModel,
  mockModelWithNulls,
} from '@/test/fixtures/modelFixtures';
import type { ModelInfo } from '@/types/model-lifecycle';

describe('EditModelDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  // ============================================================================
  // RENDERING TESTS (5 tests)
  // ============================================================================
  describe('Rendering', () => {
    it('renders dialog when isOpen is true', () => {
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Edit Model:/)).toBeInTheDocument();
    });

    it('does not render dialog when isOpen is false', () => {
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={false}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays model name in dialog title when model is provided', () => {
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText(`Edit Model: ${mockModel.meta.displayName}`)
      ).toBeInTheDocument();
    });

    it('displays all required form fields', () => {
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Check for field labels
      expect(screen.getByText(/Model Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Display Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Description/i)).toBeInTheDocument();
      expect(screen.getByText(/Context Length/i)).toBeInTheDocument();
      expect(screen.getByText(/Max Output Tokens/i)).toBeInTheDocument();
      expect(screen.getByText(/Version/i)).toBeInTheDocument();
      expect(screen.getByText(/Input Cost/i)).toBeInTheDocument();
      expect(screen.getByText(/Output Cost/i)).toBeInTheDocument();
      expect(screen.getByText(/Credits per 1K Tokens/i)).toBeInTheDocument();

      // Check for capabilities section
      expect(screen.getByText('Text Generation')).toBeInTheDocument();
      expect(screen.getByText('Vision/Image Analysis')).toBeInTheDocument();
      expect(screen.getByText('Function Calling')).toBeInTheDocument();
    });

    it('displays tier configuration fields', () => {
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Check for tier configuration section
      expect(screen.getByText(/Tier Access Configuration/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Required Tier/i).length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // FORM INTERACTION TESTS (8 tests)
  // ============================================================================
  describe('Form Interactions', () => {
    it('updates text input fields on user input', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Get all text inputs
      const inputs = screen.getAllByRole('textbox');

      // Update description field (third textbox)
      const descriptionInput = inputs.find(
        (input) => input.getAttribute('placeholder')?.includes('description') ||
                   (input as HTMLTextAreaElement).rows > 1
      );
      expect(descriptionInput).toBeTruthy();

      await user.clear(descriptionInput!);
      await user.type(descriptionInput!, 'Updated description');

      expect((descriptionInput as HTMLTextAreaElement).value).toBe('Updated description');
    });

    it('updates number input fields on user input', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Get all number inputs
      const numberInputs = screen.getAllByRole('spinbutton');

      // First number input should be context length
      const contextLengthInput = numberInputs[0];
      await user.clear(contextLengthInput);
      await user.type(contextLengthInput, '256000');

      expect((contextLengthInput as HTMLInputElement).value).toBe('256000');
    });

    it('updates pricing fields', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByRole('spinbutton');

      // Input cost field (should be step 0.01)
      const pricingFields = numberInputs.filter(input =>
        input.getAttribute('step') === '0.01'
      );
      expect(pricingFields.length).toBeGreaterThanOrEqual(2);

      const inputCostField = pricingFields[0];
      await user.clear(inputCostField);
      await user.type(inputCostField, '15.50');

      // Number inputs normalize '15.50' to '15.5'
      expect((inputCostField as HTMLInputElement).value).toBe('15.5');
    });

    it('toggles capability checkboxes', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Find the 'Long Context' capability checkbox (text shown is "Long Context")
      const longContextText = screen.getByText(/Extended context window/i);
      const longContextLabel = longContextText.closest('label');
      const longContextCheckbox = longContextLabel?.querySelector('input[type="checkbox"]');

      expect(longContextCheckbox).toBeTruthy();
      expect(longContextCheckbox).not.toBeChecked();

      // Toggle it on
      await user.click(longContextCheckbox!);
      expect(longContextCheckbox).toBeChecked();
    });

    it('toggles allowed tier checkboxes', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const allCheckboxes = screen.getAllByRole('checkbox');

      // The tier checkboxes are after the 5 capability checkboxes
      const freeTierCheckbox = allCheckboxes[5]; // First tier checkbox
      expect(freeTierCheckbox).not.toBeChecked();

      // Toggle it on
      await user.click(freeTierCheckbox);
      expect(freeTierCheckbox).toBeChecked();
    });

    it('updates select dropdowns', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Get all select elements
      const selects = screen.getAllByRole('combobox');

      // First select should be Required Tier
      const tierSelect = selects[0];
      await user.selectOptions(tierSelect, 'enterprise_pro');

      expect((tierSelect as HTMLSelectElement).value).toBe('enterprise_pro');
    });

    it('shows validation error for invalid inputs', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Get all textboxes and clear the display name (second input)
      const textboxes = screen.getAllByRole('textbox');
      const displayNameInput = textboxes[0]; // First is Model Name, but Display Name is in the inputs too

      // Try finding display name by placeholder
      const displayNameField = Array.from(document.querySelectorAll('input')).find(
        input => input.placeholder.includes('GPT-4')
      );

      if (displayNameField) {
        await user.clear(displayNameField);

        // Try to save
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        await user.click(saveButton);

        // Should show validation error
        await waitFor(() => {
          expect(screen.getByText(/Display name is required/i)).toBeInTheDocument();
        });
      }
    });

    it('disables submit button when isSaving is true', () => {
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isSaving={true}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Saving.../i });
      expect(saveButton).toBeDisabled();

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  // ============================================================================
  // API INTEGRATION TESTS (6 tests)
  // ============================================================================
  describe('API Integration', () => {
    it('calls onConfirm with updated fields on form submit', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Get all inputs and update the second one (Display Name)
      const inputs = Array.from(document.querySelectorAll('input'));
      const displayNameInput = inputs.find(input =>
        input.placeholder.includes('GPT-4') || input.value === mockModel.meta.displayName
      );

      if (displayNameInput) {
        await user.clear(displayNameInput);
        await user.type(displayNameInput, 'Updated Display Name');

        // Save
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        await user.click(saveButton);

        await waitFor(() => {
          expect(mockOnConfirm).toHaveBeenCalledTimes(1);
          expect(mockOnConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
              meta: expect.objectContaining({
                displayName: 'Updated Display Name',
              }),
            })
          );
        });
      }
    });

    it('sends correct pricing values in cents to API', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByRole('spinbutton');

      // Find input and output cost fields by placeholder text
      const inputCostField = numberInputs.find(input =>
        input.getAttribute('placeholder')?.includes('$1.25')
      );
      const outputCostField = numberInputs.find(input =>
        input.getAttribute('placeholder')?.includes('$10.00')
      );

      if (inputCostField && outputCostField) {
        await user.clear(inputCostField);
        await user.type(inputCostField, '5.25');
        await user.clear(outputCostField);
        await user.type(outputCostField, '12.50');

        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        await user.click(saveButton);

        await waitFor(() => {
          expect(mockOnConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
              meta: expect.objectContaining({
                inputCostPerMillionTokens: 525,
                outputCostPerMillionTokens: 1250,
              }),
            })
          );
        });
      }
    });

    it('does not call onConfirm when no changes are made', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/No changes detected/i)).toBeInTheDocument();
      });

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('includes reason in payload if provided', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Update display name
      const inputs = Array.from(document.querySelectorAll('input'));
      const displayNameInput = inputs.find(input => input.value === mockModel.meta.displayName);

      if (displayNameInput) {
        await user.clear(displayNameInput);
        await user.type(displayNameInput, 'Updated Name');

        // Add reason
        const textareas = screen.getAllByRole('textbox');
        const reasonField = textareas.find((el) =>
          (el as HTMLTextAreaElement).placeholder?.includes('Explain why')
        );

        if (reasonField) {
          await user.type(reasonField, 'Updating for brand consistency');

          const saveButton = screen.getByRole('button', { name: /Save Changes/i });
          await user.click(saveButton);

          await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalledWith(
              expect.objectContaining({
                reason: 'Updating for brand consistency',
              })
            );
          });
        }
      }
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when close button (X) is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = screen.getByLabelText(/Close/i);
      await user.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // STATE MANAGEMENT TESTS (4 tests)
  // ============================================================================
  describe('State Management', () => {
    it('resets form when dialog is closed and reopened', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Make changes
      const inputs = Array.from(document.querySelectorAll('input'));
      const displayNameInput = inputs.find(input => input.value === mockModel.meta.displayName);

      if (displayNameInput) {
        await user.clear(displayNameInput);
        await user.type(displayNameInput, 'Changed Name');

        // Close dialog
        rerender(
          <EditModelDialog
            model={mockModel}
            isOpen={false}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );

        // Reopen dialog
        rerender(
          <EditModelDialog
            model={mockModel}
            isOpen={true}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );

        // Form should be reset to original values
        const resetInputs = Array.from(document.querySelectorAll('input'));
        const resetInput = resetInputs.find(input => input.value === mockModel.meta.displayName);
        expect(resetInput).toBeTruthy();
      }
    });

    it('initializes form with model data when opened', () => {
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Check that values are populated
      const inputs = Array.from(document.querySelectorAll('input'));
      const modelNameInput = inputs.find(input => input.value === mockModel.name);
      const displayNameInput = inputs.find(input => input.value === mockModel.meta.displayName);

      expect(modelNameInput).toBeTruthy();
      expect(displayNameInput).toBeTruthy();
    });

    it('handles model prop changes correctly', () => {
      const { rerender } = render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      let inputs = Array.from(document.querySelectorAll('input'));
      let displayNameInput = inputs.find(input => input.value === mockModel.meta.displayName);
      expect(displayNameInput).toBeTruthy();

      // Change to different model
      rerender(
        <EditModelDialog
          model={mockAnthropicModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      inputs = Array.from(document.querySelectorAll('input'));
      displayNameInput = inputs.find(input => input.value === mockAnthropicModel.meta.displayName);
      expect(displayNameInput).toBeTruthy();
    });

    it('preserves unsaved changes when dialog remains open', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Make changes
      const inputs = Array.from(document.querySelectorAll('input'));
      const displayNameInput = inputs.find(input => input.value === mockModel.meta.displayName);

      if (displayNameInput) {
        await user.clear(displayNameInput);
        await user.type(displayNameInput, 'Changed Name');

        // Rerender without closing
        rerender(
          <EditModelDialog
            model={mockModel}
            isOpen={true}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );

        const updatedInputs = Array.from(document.querySelectorAll('input'));
        const updatedInput = updatedInputs.find(input => input.value === 'Changed Name');
        expect(updatedInput).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // EDGE CASES (3 tests)
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles null model prop gracefully', () => {
      render(
        <EditModelDialog
          model={null}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('handles missing optional fields in model data', () => {
      render(
        <EditModelDialog
          model={mockModelWithNulls}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles provider-specific metadata for different providers', () => {
      // Test OpenAI provider
      const { rerender } = render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Model Family/i)).toBeInTheDocument();

      // Test Anthropic provider
      rerender(
        <EditModelDialog
          model={mockAnthropicModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Model Series/i)).toBeInTheDocument();

      // Test Google provider
      rerender(
        <EditModelDialog
          model={mockGoogleModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Model Type/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // AUTO-CALCULATION & VALIDATION TESTS
  // ============================================================================
  describe('Auto-Calculation', () => {
    it('shows auto-calculation message when pricing is updated', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModelMinimal}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const numberInputs = screen.getAllByRole('spinbutton');

      // Find and update pricing fields
      const inputCostField = numberInputs.find(input =>
        input.getAttribute('step') === '0.01'
      );

      if (inputCostField) {
        await user.clear(inputCostField);
        await user.type(inputCostField, '10.00');

        // Should show auto-calculation message
        await waitFor(() => {
          expect(screen.queryByText(/Auto-calculated/i)).toBeInTheDocument();
        }, { timeout: 2000 });
      }
    });
  });

  describe('Validation', () => {
    it('shows error when capabilities list is empty', async () => {
      const user = userEvent.setup();
      render(
        <EditModelDialog
          model={mockModel}
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Uncheck all capabilities (first 5 checkboxes)
      const checkboxes = screen.getAllByRole('checkbox');
      for (let i = 0; i < 5; i++) {
        if (checkboxes[i].checked) {
          await user.click(checkboxes[i]);
        }
      }

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/At least one capability is required/i)).toBeInTheDocument();
      });
    });
  });
});
