import { CalendarDate, parseDate } from '@internationalized/date';
import { Index } from 'solid-js';
import { Portal } from 'solid-js/web';

import {
	DatePickerContent,
	DatePickerContext,
	DatePickerControl,
	DatePickerInput,
	DatePickerNextTrigger,
	DatePickerPositioner,
	DatePickerPrevTrigger,
	DatePickerRangeText,
	DatePicker as DatePickerRoot,
	DatePickerTable,
	DatePickerTableBody,
	DatePickerTableCell,
	DatePickerTableCellTrigger,
	DatePickerTableHead,
	DatePickerTableHeader,
	DatePickerTableRow,
	DatePickerTrigger,
	DatePickerView,
	DatePickerViewControl,
	DatePickerViewTrigger
} from './ui/date-picker';

type DatePickerProps = {
	name: string;
	setValue: (value: Date) => void;
	value: Date;
};
export function DatePicker(props: DatePickerProps) {
	return (
		<DatePickerRoot
			defaultValue={[
				new CalendarDate(
					props.value.getFullYear(),
					props.value.getMonth() + 1,
					props.value.getDate()
				)
			]}
			format={(e) => {
				const parsedDate = new Date(Date.parse(e.toString()));

				const normalizedDate = new Date(
					parsedDate.getUTCFullYear(),
					parsedDate.getUTCMonth(),
					parsedDate.getUTCDate()
				);

				return new Intl.DateTimeFormat('en-US', {
					dateStyle: 'long'
				}).format(normalizedDate);
			}}
			name={props.name}
			onValueChange={(event) => {
				console.log(new Date(event.valueAsString[0]));
			}}
			startOfWeek={1}
		>
			<DatePickerControl>
				<DatePickerInput
					onChange={(event) => console.log(event.currentTarget.value)}
					placeholder="Pick a date"
				/>
				<DatePickerTrigger />
			</DatePickerControl>
			<Portal>
				<DatePickerPositioner>
					<DatePickerContent>
						<DatePickerView view="day">
							<DatePickerContext>
								{(api) => (
									<>
										<DatePickerViewControl>
											<DatePickerPrevTrigger />
											<DatePickerViewTrigger>
												<DatePickerRangeText />
											</DatePickerViewTrigger>
											<DatePickerNextTrigger />
										</DatePickerViewControl>
										<DatePickerTable>
											<DatePickerTableHead>
												<DatePickerTableRow>
													<Index each={api().weekDays}>
														{(weekDay) => (
															<DatePickerTableHeader>{weekDay().short}</DatePickerTableHeader>
														)}
													</Index>
												</DatePickerTableRow>
											</DatePickerTableHead>
											<DatePickerTableBody>
												<Index each={api().weeks}>
													{(week) => (
														<DatePickerTableRow>
															<Index each={week()}>
																{(day) => (
																	<DatePickerTableCell value={day()}>
																		<DatePickerTableCellTrigger>
																			{day().day}
																		</DatePickerTableCellTrigger>
																	</DatePickerTableCell>
																)}
															</Index>
														</DatePickerTableRow>
													)}
												</Index>
											</DatePickerTableBody>
										</DatePickerTable>
									</>
								)}
							</DatePickerContext>
						</DatePickerView>
						<DatePickerView view="month">
							<DatePickerContext>
								{(api) => (
									<>
										<DatePickerViewControl>
											<DatePickerPrevTrigger />
											<DatePickerViewTrigger>
												<DatePickerRangeText />
											</DatePickerViewTrigger>
											<DatePickerNextTrigger />
										</DatePickerViewControl>
										<DatePickerTable>
											<DatePickerTableBody>
												<Index each={api().getMonthsGrid({ columns: 4, format: 'short' })}>
													{(months) => (
														<DatePickerTableRow>
															<Index each={months()}>
																{(month) => (
																	<DatePickerTableCell value={month().value}>
																		<DatePickerTableCellTrigger>
																			{month().label}
																		</DatePickerTableCellTrigger>
																	</DatePickerTableCell>
																)}
															</Index>
														</DatePickerTableRow>
													)}
												</Index>
											</DatePickerTableBody>
										</DatePickerTable>
									</>
								)}
							</DatePickerContext>
						</DatePickerView>
						<DatePickerView view="year">
							<DatePickerContext>
								{(api) => (
									<>
										<DatePickerViewControl>
											<DatePickerPrevTrigger />
											<DatePickerViewTrigger>
												<DatePickerRangeText />
											</DatePickerViewTrigger>
											<DatePickerNextTrigger />
										</DatePickerViewControl>
										<DatePickerTable>
											<DatePickerTableBody>
												<Index each={api().getYearsGrid({ columns: 4 })}>
													{(years) => (
														<DatePickerTableRow>
															<Index each={years()}>
																{(year) => (
																	<DatePickerTableCell value={year().value}>
																		<DatePickerTableCellTrigger>
																			{year().label}
																		</DatePickerTableCellTrigger>
																	</DatePickerTableCell>
																)}
															</Index>
														</DatePickerTableRow>
													)}
												</Index>
											</DatePickerTableBody>
										</DatePickerTable>
									</>
								)}
							</DatePickerContext>
						</DatePickerView>
					</DatePickerContent>
				</DatePickerPositioner>
			</Portal>
		</DatePickerRoot>
	);
}

export default DatePicker;
