use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StickyNote {
    pub id: u32,
    pub body: String,
    pub color: String,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
    pub pinned_at_ms: Option<i64>,
    pub position: i64,
    pub archived_at_ms: Option<i64>,
}
