'use client'

import { Fragment } from 'react'
import { CheckCircle, Circle, ChevronRight } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { ScreenTemplateFormProps } from '@/containers/memos/lib/types'
import { ScreenField } from '@/containers/memos/components/ScreenField'
import { EconomicsTable } from '@/containers/memos/components/EconomicsTable'
import { SupportingCharts } from '@/containers/memos/components/SupportingCharts'
import { RadioCheckField } from '@/containers/memos/components/RadioCheckField'
import { ScreenTemplateView } from '@/containers/memos/components/ScreenTemplateView'
import { TextAreaField } from '@/containers/memos/components/shared/TextAreaField'
import { DataCompletenessChart } from '@/containers/memos/components/shared/DataCompletenessChart'
import {
  KEY_DATA_FIELD_IDS,
  SNAPSHOT_FIELDS_ROW_1,
  SNAPSHOT_FIELDS_ROW_2,
  SNAPSHOT_FIELDS_ROW_3,
  TAM_FIELD_GRIDS,
  MARKET_SHARE_ROW_1,
  MARKET_SHARE_ROW_2,
  ANALYZABILITY_FIELDS,
  ANALYSIS_QUESTIONS,
  MOAT_QUESTIONS,
  MANAGEMENT_QUESTIONS,
} from '@/containers/memos/lib/constants'
import { calculateCompletionStats } from '@/containers/memos/lib/helpers'

export function ScreenTemplateForm({
  formValues,
  validationErrors,
  onFieldChange,
  isViewOnly = false,
  isFieldsEnabled: _isFieldsEnabled = true,
  templateImageUrls = {},
}: ScreenTemplateFormProps) {
  const { completedFields, totalFields, completionPercentage } = calculateCompletionStats(
    formValues,
    KEY_DATA_FIELD_IDS
  )

  if (isViewOnly) {
    return <ScreenTemplateView formValues={formValues} templateImageUrls={templateImageUrls} />
  }

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 bg-white">
        <CardContent className="px-5 py-3">
          <h2 className="mb-3 text-base font-semibold text-gray-900">
            Key Data Snapshot & Screening Score
          </h2>

          <div className="flex gap-6">
            <div className="flex-1">
              <div className="grid grid-cols-4 gap-x-4 gap-y-3">
                {SNAPSHOT_FIELDS_ROW_1.map((field) => (
                  <ScreenField
                    key={field.id}
                    {...field}
                    value={formValues[field.id] as string}
                    onChange={onFieldChange}
                    validationErrors={validationErrors}
                    isViewOnly={('viewOnly' in field && field.viewOnly) || isViewOnly}
                  />
                ))}
                {SNAPSHOT_FIELDS_ROW_2.map((field) => (
                  <ScreenField
                    key={field.id}
                    id={field.id}
                    label={field.label}
                    type={field.type}
                    placeholder={'placeholder' in field ? field.placeholder : undefined}
                    selectOptions={
                      'selectOptions' in field ? ([...field.selectOptions] as string[]) : undefined
                    }
                    value={formValues[field.id] as string}
                    onChange={onFieldChange}
                    validationErrors={validationErrors}
                    isViewOnly={isViewOnly}
                  />
                ))}
                {SNAPSHOT_FIELDS_ROW_3.map((field) => (
                  <ScreenField
                    key={field.id}
                    {...field}
                    value={formValues[field.id] as string}
                    onChange={onFieldChange}
                    validationErrors={validationErrors}
                    isViewOnly={isViewOnly}
                  />
                ))}
              </div>
            </div>

            <div className="w-[280px] shrink-0">
              <Card className="border border-gray-200 bg-white">
                <CardContent className="p-4">
                  <h3 className="mb-3 text-center text-xs font-semibold text-gray-900">
                    Data Completeness
                  </h3>
                  <DataCompletenessChart
                    completed={completedFields}
                    total={totalFields}
                    percentage={completionPercentage}
                  />
                  <p className="text-center text-[11px] text-gray-600">
                    Complete all fields to finalize thesis.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Business & Thesis</h2>
        <TextAreaField
          id="businessOverview"
          label="In 1-2 sentences - What do they do?"
          value={formValues.businessOverview as string}
          onChange={onFieldChange}
          placeholder="Management and strategic consulting..."
          validationErrors={validationErrors}
          isViewOnly={isViewOnly}
        />
        <TextAreaField
          id="variantPerception"
          label="What is the thesis on how we make money?"
          value={formValues.variantPerception as string}
          onChange={onFieldChange}
          placeholder="Continued execution..."
          validationErrors={validationErrors}
          isViewOnly={isViewOnly}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Market Analysis</h2>

        <details open className="group rounded-lg border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-3.5 text-sm font-normal text-gray-900">
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
            Input
          </summary>

          <div className="space-y-5 px-5 pb-5">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-900">
                Size of the TAM and how fast is it growing?
              </h3>
              <div className="grid grid-cols-4 gap-x-4 gap-y-4">
                {TAM_FIELD_GRIDS.map(({ fields }, rowIndex) => (
                  <Fragment key={rowIndex}>
                    {fields.map((field) => (
                      <ScreenField
                        key={field.id}
                        id={field.id}
                        label={field.label}
                        type={field.type as 'text' | 'number' | 'select'}
                        required={
                          'required' in field ? (field.required as boolean | undefined) : undefined
                        }
                        placeholder={'placeholder' in field ? field.placeholder : undefined}
                        step={'step' in field ? field.step : undefined}
                        selectOptions={
                          'selectOptions' in field && field.selectOptions
                            ? ([...field.selectOptions] as string[])
                            : undefined
                        }
                        value={formValues[field.id] as string}
                        onChange={onFieldChange}
                        validationErrors={validationErrors}
                        isViewOnly={isViewOnly}
                      />
                    ))}
                    {Array.from({ length: 4 - fields.length }, (_, i) => (
                      <div key={`tam-empty-${rowIndex}-${i}`} aria-hidden />
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-900">What is their market share?</h3>
              <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                {([...MARKET_SHARE_ROW_1, ...MARKET_SHARE_ROW_2] as const).map((field) => (
                  <ScreenField
                    key={field.id}
                    id={field.id}
                    label={field.label}
                    type={field.type as 'text' | 'number' | 'select'}
                    required={
                      'required' in field ? (field.required as boolean | undefined) : undefined
                    }
                    placeholder={'placeholder' in field ? field.placeholder : undefined}
                    step={'step' in field ? field.step : undefined}
                    selectOptions={
                      'selectOptions' in field && field.selectOptions
                        ? ([...field.selectOptions] as string[])
                        : undefined
                    }
                    value={formValues[field.id] as string}
                    onChange={onFieldChange}
                    validationErrors={validationErrors}
                    isViewOnly={isViewOnly}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-900">Momentum & Audit</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <ScreenField
                    id="takingMarketShare"
                    label="DO THEY APPEAR TO BE TAKING MARKET SHARE?"
                    type="select"
                    selectOptions={['Select...', 'Yes', 'No', 'Uncertain']}
                    value={formValues.takingMarketShare as string}
                    onChange={onFieldChange}
                    validationErrors={validationErrors}
                    isViewOnly={isViewOnly}
                  />
                  <div />
                </div>
                <div>
                  <Label className="mb-2 block text-[10px] font-medium tracking-wide text-gray-600 uppercase">
                    IS IT ANALYZABLE?
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    {ANALYZABILITY_FIELDS.map((field) => (
                      <ScreenField
                        key={field.id}
                        id={field.id}
                        label={field.label}
                        type="select"
                        selectOptions={[...field.selectOptions] as string[]}
                        value={formValues[field.id] as string}
                        onChange={onFieldChange}
                        validationErrors={validationErrors}
                        isViewOnly={isViewOnly}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>

        <details className="group rounded-lg border border-gray-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-3.5 text-sm font-normal text-gray-900">
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
            Analysis
          </summary>
          <div className="space-y-4 px-5 pb-5">
            {ANALYSIS_QUESTIONS.map((q) => (
              <RadioCheckField
                key={q.id}
                id={q.id}
                label={q.label}
                value={formValues[q.id] as string}
                onChange={onFieldChange}
                isViewOnly={isViewOnly}
              />
            ))}
          </div>
        </details>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Moat Analysis</h2>
        {MOAT_QUESTIONS.map((q) => (
          <RadioCheckField
            key={q.id}
            id={q.id}
            label={q.label}
            value={formValues[q.id] as string}
            onChange={onFieldChange}
            isViewOnly={isViewOnly}
          />
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="mb-3 flex items-center justify-between gap-2 text-base font-semibold text-gray-900">
          <span>
            What are the economics of the business? (Gross Margin, EBIT Margin, ROIC, ROE, Unit
            Economics)
          </span>
          {formValues.economicsDataGrid &&
          (formValues.economicsDataGrid as string).trim().length > 0 ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 shrink-0 text-gray-300" />
          )}
        </h2>
        <EconomicsTable
          value={formValues.economicsDataGrid as string}
          onChange={(val) => onFieldChange('economicsDataGrid', val)}
          isViewOnly={isViewOnly}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Supporting Charts</h2>
        <SupportingCharts
          value={formValues.supportingCharts as string}
          onChange={(val) => onFieldChange('supportingCharts', val)}
          isViewOnly={isViewOnly}
          templateImageUrls={templateImageUrls}
        />
      </div>

      <Card className="border border-gray-200 bg-white">
        <CardContent className="space-y-4 px-5 py-4">
          <h3 className="text-sm font-medium text-gray-900">Management Quality</h3>
          {MANAGEMENT_QUESTIONS.map((q) => (
            <RadioCheckField
              key={q.id}
              id={q.id}
              label={q.label}
              value={formValues[q.id] as string}
              onChange={onFieldChange}
              isViewOnly={isViewOnly}
            />
          ))}
          <RadioCheckField
            id="preMortem"
            label="Biggest Concerns"
            value={formValues.preMortem as string}
            onChange={onFieldChange}
            isViewOnly={isViewOnly}
            maxWords={300}
          />
          <RadioCheckField
            id="capitalAllocation"
            label="Do they have a strong capital allocation track record?"
            value={formValues.capitalAllocation as string}
            onChange={onFieldChange}
            isViewOnly={isViewOnly}
          />
        </CardContent>
      </Card>
    </div>
  )
}
