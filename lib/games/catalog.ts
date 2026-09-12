import {
  Camera,
  Gift,
  Grid3x3,
  HelpCircle,
  Hourglass,
  ListChecks,
  MessageSquareQuote,
  Swords,
  ThumbsUp,
  Trophy,
  UserSearch,
  type LucideIcon,
} from "lucide-react";

import type { GameType } from "@/lib/validations/games";

/**
 * Как гость вводит ответ. От этого зависит и форма на телефоне, и то,
 * какие поля показывает ведущему настройка игры.
 */
export type GameInputKind =
  | "text" // свободный ответ
  | "choice" // выбор из вариантов
  | "task" // случайное задание из списка + отчёт о выполнении
  | "photo" // загрузка фотографии
  | "bingo" // карточка с клетками, каждая отмечается отдельно
  | "vote" // голосование за чужое фото
  | "host"; // баллы начисляет только ведущий

export type GameDefinition = {
  type: ContestGameType;
  label: string;
  /** Короткое описание для ведущего в настройках */
  description: string;
  /** Что увидит гость под названием игры, если ведущий не задал свой текст */
  defaultPrompt: string;
  icon: LucideIcon;
  input: GameInputKind;
  defaultPoints: number;
  /** Творческие задания по умолчанию уходят на подтверждение ведущему */
  defaultRequiresApproval: boolean;
  /** Нужен ли список вариантов/заданий в настройках */
  needsOptions: boolean;
  /** Есть ли правильный вариант (за него начисляются баллы) */
  hasCorrectOption: boolean;
  /** Можно ли отправить больше одного результата от команды */
  allowsMultipleEntries: boolean;
  /** Подпись к списку вариантов в настройках */
  optionsLabel?: string;
  defaultOptions?: string[];
};

/**
 * photo_vote живёт только в event_games — сами голоса пишутся в photo_votes,
 * поэтому в game_entries этого типа нет.
 */
export type ContestGameType = GameType | "photo_vote";

export const CONTEST_GAMES: GameDefinition[] = [
  {
    type: "question",
    label: "Вопрос дня",
    description: "Один открытый вопрос всем гостям. Ответы собираются в ленту и выводятся на экран зала.",
    defaultPrompt: "Какой момент сегодняшнего вечера запомнится вам больше всего?",
    icon: HelpCircle,
    input: "text",
    defaultPoints: 10,
    defaultRequiresApproval: false,
    needsOptions: false,
    hasCorrectOption: false,
    allowsMultipleEntries: false,
  },
  {
    type: "poll",
    label: "Опрос",
    description: "Голосование с вариантами. Баллы получает каждая команда, которая проголосовала.",
    defaultPrompt: "Что ставим следующим треком?",
    icon: ListChecks,
    input: "choice",
    defaultPoints: 5,
    defaultRequiresApproval: false,
    needsOptions: true,
    hasCorrectOption: false,
    allowsMultipleEntries: false,
    optionsLabel: "Варианты ответа",
    defaultOptions: ["Медленный танец", "Что-нибудь заводное", "Живая музыка"],
  },
  {
    type: "guess_guest",
    label: "Угадай гостя",
    description: "Факт об одном из гостей — команда угадывает, о ком речь. Один вариант верный.",
    defaultPrompt: "Кто из гостей — герой этой истории?",
    icon: UserSearch,
    input: "choice",
    defaultPoints: 15,
    defaultRequiresApproval: false,
    needsOptions: true,
    hasCorrectOption: true,
    allowsMultipleEntries: false,
    optionsLabel: "Имена гостей",
    // Имена вписывает ведущий: заготовки ушли бы гостям как настоящие варианты
    defaultOptions: [],
  },
  {
    type: "millionaire",
    label: "Миллионер",
    description: "Вопрос с четырьмя вариантами и высокой ставкой. Баллы только за верный ответ.",
    defaultPrompt: "Вопрос на главный приз вечера",
    icon: Trophy,
    input: "choice",
    defaultPoints: 30,
    defaultRequiresApproval: false,
    needsOptions: true,
    hasCorrectOption: true,
    allowsMultipleEntries: false,
    optionsLabel: "Варианты ответа",
    // Варианты вписывает ведущий — заготовки «Вариант A…D» гостям не показываем
    defaultOptions: [],
  },
  {
    type: "photo_challenge",
    label: "Фотозадание",
    description: "Задание снять определённый кадр. Ведущий подтверждает снимок и начисляет баллы.",
    defaultPrompt: "Сделайте общий снимок команды с кем-нибудь из организаторов",
    icon: Camera,
    input: "photo",
    defaultPoints: 25,
    defaultRequiresApproval: true,
    needsOptions: false,
    hasCorrectOption: false,
    allowsMultipleEntries: true,
  },
  {
    type: "wheel_task",
    label: "Колесо заданий",
    description: "Каждой команде достаётся случайное задание из списка.",
    defaultPrompt: "Выполните задание всей командой и расскажите, как всё прошло",
    icon: Gift,
    input: "task",
    defaultPoints: 20,
    defaultRequiresApproval: true,
    needsOptions: true,
    hasCorrectOption: false,
    allowsMultipleEntries: false,
    optionsLabel: "Задания для колеса",
    defaultOptions: [
      "Спойте припев песни, которая звучала на первом танце",
      "Соберите автографы трёх гостей с других столов",
      "Придумайте и покажите девиз своей команды",
      "Сделайте общий снимок в прыжке",
    ],
  },
  {
    type: "secret_mission",
    label: "Тайная миссия",
    description: "У каждой команды своя миссия. Остальные о ней не знают.",
    defaultPrompt: "Выполните миссию так, чтобы никто не догадался",
    icon: MessageSquareQuote,
    input: "task",
    defaultPoints: 20,
    defaultRequiresApproval: true,
    needsOptions: true,
    hasCorrectOption: false,
    allowsMultipleEntries: false,
    optionsLabel: "Список миссий",
    defaultOptions: [
      "Незаметно узнайте, как познакомились молодожёны",
      "Подружитесь с командой за соседним столом",
      "Уговорите кого-нибудь произнести тост",
    ],
  },
  {
    type: "bingo",
    label: "Бинго",
    description: "Карточка с клетками-заданиями. Команда отмечает выполненные, ведущий подтверждает.",
    defaultPrompt: "Закройте как можно больше клеток за вечер",
    icon: Grid3x3,
    input: "bingo",
    defaultPoints: 10,
    defaultRequiresApproval: true,
    needsOptions: true,
    hasCorrectOption: false,
    allowsMultipleEntries: true,
    optionsLabel: "Клетки карточки",
    defaultOptions: [
      "Потанцевали всей командой",
      "Познакомились с новым гостем",
      "Попали в кадр фотографа",
      "Произнесли тост",
      "Спели вместе со всеми",
      "Сделали селфи с молодожёнами",
    ],
  },
  {
    type: "time_capsule",
    label: "Капсула пожеланий",
    description: "Пожелание, которое организатор откроет и прочитает спустя время.",
    defaultPrompt: "Напишите пожелание, которое прочитают через год",
    icon: Hourglass,
    input: "text",
    defaultPoints: 5,
    defaultRequiresApproval: false,
    needsOptions: false,
    hasCorrectOption: false,
    allowsMultipleEntries: false,
  },
  {
    type: "photo_vote",
    label: "Приз зрительских симпатий",
    description: "Гости выбирают лучший снимок вечера. Баллы получает команда проголосовавшего.",
    defaultPrompt: "Выберите лучший снимок вечера",
    icon: ThumbsUp,
    input: "vote",
    defaultPoints: 5,
    defaultRequiresApproval: false,
    needsOptions: false,
    hasCorrectOption: false,
    allowsMultipleEntries: false,
  },
  {
    type: "team_battle",
    label: "Битва команд",
    description: "Конкурс в зале. Баллы командам начисляет ведущий вручную.",
    defaultPrompt: "Конкурс проходит в зале, баллы начисляет ведущий",
    icon: Swords,
    input: "host",
    defaultPoints: 30,
    defaultRequiresApproval: false,
    needsOptions: false,
    hasCorrectOption: false,
    allowsMultipleEntries: true,
  },
];

export const CONTEST_GAME_BY_TYPE = new Map<ContestGameType, GameDefinition>(
  CONTEST_GAMES.map((game) => [game.type, game]),
);

export function getGameDefinition(type: string): GameDefinition | undefined {
  return CONTEST_GAME_BY_TYPE.get(type as ContestGameType);
}

export function gameLabel(type: string): string {
  return getGameDefinition(type)?.label ?? type;
}

/**
 * Устойчивый выбор задания для команды: одна и та же команда всегда видит одно
 * и то же задание, но у разных команд они разные. Случайность на клиенте не
 * подошла бы — задание менялось бы при каждой перезагрузке страницы.
 */
export function pickTaskForTeam(options: string[], teamId: string): string | null {
  if (options.length === 0) return null;

  let hash = 0;
  for (let index = 0; index < teamId.length; index += 1) {
    hash = (hash * 31 + teamId.charCodeAt(index)) % 100000;
  }

  return options[hash % options.length];
}
