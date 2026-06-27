use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyNote {
    pub id: u32,
    pub note_date: String,
    pub body_html: String,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyNoteNavigation {
    pub previous_note_date: Option<String>,
    pub next_note_date: Option<String>,
}
