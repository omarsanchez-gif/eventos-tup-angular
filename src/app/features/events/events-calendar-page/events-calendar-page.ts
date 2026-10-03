import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FullCalendarModule, type CalendarOptions } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/angular/daygrid';
import listPlugin from '@fullcalendar/angular/list';
import allLocales from '@fullcalendar/angular/locales-all';
import themePlugin from '@fullcalendar/angular/themes/classic';
import timeGridPlugin from '@fullcalendar/angular/timegrid';
import type { DatesSetInfo, EventClickInfo } from 'fullcalendar';

import type { EventSummary, EventTemporalStatus } from '../../../shared/models/system-event';
import { EventsFacade } from '../state/events.facade';
import { toCalendarEvent } from './calendar-event.mapper';

interface CalendarEventMountInfo {
  readonly event: { readonly id: string };
  readonly el: HTMLElement;
}

@Component({
  selector: 'app-events-calendar-page',
  imports: [A11yModule, FullCalendarModule, RouterLink],
  providers: [EventsFacade],
  templateUrl: './events-calendar-page.html',
  styleUrl: './events-calendar-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsCalendarPage implements OnInit {
  protected readonly events = inject(EventsFacade);
  protected readonly selectedEvent = signal<EventSummary | null>(null);
  protected readonly campusFilter = signal<string | null>(null);
  protected readonly statusFilter = signal<EventTemporalStatus | null>(null);
  private readonly visibleRange = signal<{ start: string; end: string } | null>(null);
  private readonly visibleItems = computed(() => {
    const status = this.statusFilter();
    return status
      ? this.events.calendarItems().filter((item) => item.status === status)
      : this.events.calendarItems();
  });
  protected readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [themePlugin, dayGridPlugin, timeGridPlugin, listPlugin],
    locales: allLocales,
    locale: 'es',
    timeZone: 'America/Cancun',
    initialView:
      typeof window !== 'undefined' && window.innerWidth < 700 ? 'listMonth' : 'dayGridMonth',
    headerToolbar: {
      left: 'prev,today,next',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      list: 'Lista',
    },
    editable: false,
    selectable: false,
    eventStartEditable: false,
    eventDurationEditable: false,
    navLinks: false,
    nowIndicator: true,
    height: 'auto',
    fixedWeekCount: false,
    dayMaxEvents: 4,
    moreLinkText: (count) => `+${count} más`,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    eventOrder: 'start,title',
    events: this.visibleItems().map((item) => toCalendarEvent(item, this.statusLabel(item.status))),
    datesSet: (info) => this.rangeChanged(info),
    eventClick: (info) => this.eventClicked(info),
    eventDidMount: (info) => this.decorateEvent(info),
  }));

  ngOnInit(): void {
    void this.events.load();
  }

  protected campusChanged(event: Event): void {
    this.campusFilter.set((event.target as HTMLSelectElement).value || null);
    void this.reloadVisibleRange();
  }

  protected statusChanged(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusFilter.set(value ? (value as EventTemporalStatus) : null);
  }

  protected closeDetail(): void {
    this.selectedEvent.set(null);
    this.events.clearDetail();
  }

  protected statusLabel(status: EventTemporalStatus): string {
    return {
      programado: 'Programado',
      en_ejecucion: 'En ejecución',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
    }[status];
  }

  protected formatInterval(event: EventSummary): string {
    return event.dateStart === event.dateEnd
      ? `${event.dateStart} · ${event.timeStart}–${event.timeEnd}`
      : `${event.dateStart} ${event.timeStart} – ${event.dateEnd} ${event.timeEnd}`;
  }

  protected integrationLabel(
    value: EventSummary['calendarStatus'] | EventSummary['notificationStatus'],
  ): string {
    return {
      pendiente: 'Pendiente',
      sincronizado: 'Sincronizado',
      error: 'Requiere revisión',
      retirado: 'Retirado',
      completas: 'Completas',
      parciales: 'Parciales',
      no_aplica: 'No aplica',
    }[value];
  }

  @HostListener('document:keydown.escape')
  protected escape(): void {
    if (this.selectedEvent()) this.closeDetail();
  }

  private rangeChanged(info: DatesSetInfo): void {
    this.visibleRange.set({ start: info.startStr, end: info.endStr });
    void this.reloadVisibleRange();
  }

  private reloadVisibleRange(): Promise<void> {
    const range = this.visibleRange();
    return range
      ? this.events.loadCalendar(range.start, range.end, this.campusFilter())
      : Promise.resolve();
  }

  private eventClicked(info: EventClickInfo): void {
    const event = this.events.calendarItems().find((item) => item.eventId === info.event.id);
    if (event) {
      this.selectedEvent.set(event);
      void this.events.loadDetail(event.eventId).then((detail) => {
        if (detail) this.selectedEvent.set(detail);
      });
    }
  }

  private decorateEvent(info: CalendarEventMountInfo): void {
    const event = this.events.calendarItems().find((item) => item.eventId === info.event.id);
    if (!event) return;
    info.el.setAttribute(
      'aria-label',
      `${event.name}, ${this.formatInterval(event)}, ${event.campusName}, ${this.statusLabel(event.status)}`,
    );
    info.el.setAttribute('tabindex', '0');
    info.el.addEventListener('keydown', (keyboardEvent) => {
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        this.selectedEvent.set(event);
        void this.events.loadDetail(event.eventId).then((detail) => {
          if (detail) this.selectedEvent.set(detail);
        });
      }
    });
  }
}
